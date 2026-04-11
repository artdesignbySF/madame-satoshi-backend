// --- START OF FILE backend/withdrawalRoutes.js ---
const express = require("express");
const axios = require("axios");

// Helper function to attempt LNbits API call for Withdraw Link Creation
async function attemptLnbitsWithdrawLink(config, payload) {
    try {
        const response = await axios.post(
            `${process.env.LNBITS_INTERNAL_URL || config.lnbitsUrl}/withdraw/api/v1/links`,
            payload,
            {
                headers: {
                    "X-Api-Key": config.lnbitsPayoutAdminKey,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            },
        );
        if (!response.data?.lnurl || !response.data?.id) {
            throw new Error(
                "LNbits did not return a valid link or ID for withdraw link.",
            );
        }
        return response.data;
    } catch (error) {
        console.error(
            "LNbits LNURL creation failed:",
            error.response?.data || error.message,
        );
        throw new Error(
            `LNbits LNURL creation error: ${error.response?.data?.detail || error.message}`,
        );
    }
}

// Helper function to attempt LNbits API call for Deleting Withdraw Link
async function attemptLnbitsDeleteWithdrawLink(config, linkId) {
    if (!linkId) return false;
    try {
        console.log(
            ` -> Attempting to delete previous LNURL Withdraw Link ID from LNbits: ${linkId}`,
        );
        await axios.delete(
            `${process.env.LNBITS_INTERNAL_URL || config.lnbitsUrl}/withdraw/api/v1/links/${linkId}`,
            {
                headers: {
                    "X-Api-Key": config.lnbitsPayoutAdminKey,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            },
        );
        console.log(
            ` -> Successfully deleted LNURL Withdraw Link ID: ${linkId} from LNbits.`,
        );
        return true;
    } catch (deleteError) {
        console.warn(
            ` -> Failed/Unable to delete LNURL Withdraw Link ID ${linkId} from LNbits (may already be used/gone/invalid):`,
            deleteError.response?.status,
            deleteError.response?.data || deleteError.message,
        );
        // If it's a 404, the link is already gone, which is fine for our purposes.
        return deleteError.response?.status === 404;
    }
}

// Helper function to attempt Internal Transfer (Main Wallet to Payout Wallet for LNURL funding)
async function attemptInternalTransfer(config, amount, memo) {
    let internalInvoiceOnPayoutWallet = null;
    try {
        const invoicePayload = {
            out: false,
            amount: amount,
            memo: memo,
            webhook: "",
        };
        const invResponse = await axios.post(
            `${process.env.LNBITS_INTERNAL_URL || config.lnbitsUrl}/api/v1/payments`,
            invoicePayload,
            {
                headers: {
                    "X-Api-Key": config.lnbitsPayoutAdminKey,
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            },
        );
        if (!invResponse.data?.payment_request)
            throw new Error(
                "LNbits did not return payment_request for internal invoice on Payout Wallet.",
            );
        internalInvoiceOnPayoutWallet = invResponse.data.payment_request;
        console.log(
            ` -> Internal invoice created on Payout Wallet for ${amount} sats.`,
        );
    } catch (invError) {
        console.error(
            "Internal invoice creation (on Payout Wallet) failed:",
            invError.response?.data || invError.message,
        );
        throw new Error(
            `Internal invoice (Payout) failed: ${invError.response?.data?.detail || invError.message}`,
        );
    }
    try {
        const paymentPayload = {
            out: true,
            bolt11: internalInvoiceOnPayoutWallet,
        };
        const paymentResponse = await axios.post(
            `${process.env.LNBITS_INTERNAL_URL || config.lnbitsUrl}/api/v1/payments`,
            paymentPayload,
            {
                headers: {
                    "X-Api-Key": config.lnbitsMainAdminKey,
                    "Content-Type": "application/json",
                },
                timeout: 45000,
            },
        );
        if (!paymentResponse.data?.payment_hash) {
            if (
                paymentResponse.data?.detail
                    ?.toLowerCase()
                    .includes("insufficient balance")
            ) {
                throw new Error(
                    "Operator Main Wallet has insufficient funds for transfer to Payout Wallet.",
                );
            }
            throw new Error(
                paymentResponse.data?.detail ||
                    "Internal payment from Main to Payout failed (no payment_hash).",
            );
        }
        console.log(
            ` -> Internal transfer from Main to Payout successful. Payment Hash: ${paymentResponse.data.payment_hash.substring(0, 10)}...`,
        );
        return true;
    } catch (paymentError) {
        console.error(
            "Internal payment (Main to Payout) failed:",
            paymentError.response?.data || paymentError.message,
        );
        if (paymentError.message?.includes("insufficient funds"))
            throw paymentError;
        throw new Error(
            `Internal payment (Main to Payout) failed: ${paymentError.response?.data?.detail || paymentError.message}`,
        );
    }
}

// Factory function for the router
const createWithdrawalRouter = (db, config) => {
    const router = express.Router();
    const internalLnbitsUrl = process.env.LNBITS_INTERNAL_URL || config.lnbitsUrl;

    // Fix 4: In-memory rate limiter — max 5 /generate-withdraw-lnurl calls per session per minute
    const withdrawalRateLimit = new Map();
    const RATE_LIMIT_MAX = 5;
    const RATE_LIMIT_WINDOW_MS = 60 * 1000;

    function checkRateLimit(sessionId) {
        const now = Date.now();
        const timestamps = (withdrawalRateLimit.get(sessionId) || [])
            .filter(t => now - t < RATE_LIMIT_WINDOW_MS);
        if (timestamps.length >= RATE_LIMIT_MAX) return false;
        timestamps.push(now);
        withdrawalRateLimit.set(sessionId, timestamps);
        return true;
    }

    const getActiveLinkKey = (sessionId) => `active_lnurl_${sessionId}`;
    const getFundedLinkDetailsKey = (linkId) =>
        `funded_details_lnurl_${linkId}`;

    async function getUserBalance(sessionId) {
        if (!sessionId) return 0;
        const b = await db.get(`balance_${sessionId}`);
        return Math.max(0, parseInt(b || 0));
    }

    async function updateUserBalance(sessionId, amountToAdd) {
        if (!sessionId || isNaN(amountToAdd)) return 0;
        const currentBalance = await getUserBalance(sessionId);
        const newBalance = Math.max(
            0,
            currentBalance + Math.floor(amountToAdd),
        );
        await db.set(`balance_${sessionId}`, newBalance);
        console.log(
            ` -> Session ${sessionId.substring(0, 6)} balance update by ${Math.floor(amountToAdd)}. Old: ${currentBalance}, New: ${newBalance}`,
        );
        return newBalance;
    }

    router.post("/generate-withdraw-lnurl", async (req, res) => {
        const { sessionId, amount: clientRequestedAmountStr } = req.body;
        let newGeneratedLinkId = null;
        // Fix 1: Track whether we pre-decremented the balance so we can restore it on failure
        let balanceDecremented = false;
        let amountDecremented = 0;
        // Fix 1: Track whether the payout funding actually completed so we know
        // not to delete a live funded LNURL if a subsequent DB operation fails
        let fundingComplete = false;
        const activeLinkKey = getActiveLinkKey(sessionId);

        if (!sessionId)
            return res.status(400).json({ error: "Session ID required." });
        if (
            !config.lnbitsUrl ||
            !config.lnbitsPayoutAdminKey ||
            !config.lnbitsMainAdminKey
        ) {
            console.error(
                "/generate-withdraw-lnurl error: Missing required LNbits keys.",
            );
            return res
                .status(500)
                .json({ error: "Withdrawal service misconfigured." });
        }

        // Fix 4: Enforce rate limit before doing any work
        if (!checkRateLimit(sessionId)) {
            return res.status(429).json({ error: "Too many withdrawal requests. Please wait a minute." });
        }

        console.log(
            `Request: /generate-withdraw-lnurl for session ${sessionId.substring(0, 6)}, Amount from client: ${clientRequestedAmountStr}`,
        );

        try {
            const existingLinkId = await db.get(activeLinkKey);
            if (existingLinkId) {
                console.log(
                    ` -> Found existing active link ID: ${existingLinkId}. Checking status directly with LNbits...`,
                );
                let wasClaimed = false;
                const existingLinkFundedDetailsKey =
                    getFundedLinkDetailsKey(existingLinkId);
                const existingLinkFundedDetails = await db.get(
                    existingLinkFundedDetailsKey,
                );

                // Fix 3: Direct LNbits API call instead of self-referencing HTTP request.
                // The old approach (axios.get to our own /api/check-lnurl-claim endpoint) was
                // unreliable — timeouts or in-flight errors would silently default to "not claimed"
                // and allow a refund of funds the user had already received.
                try {
                    const checkUrl = `${internalLnbitsUrl}/withdraw/api/v1/links/${existingLinkId}`;
                    const linkResponse = await axios.get(checkUrl, {
                        headers: { "X-Api-Key": config.lnbitsPayoutAdminKey },
                        timeout: 10000,
                    });
                    if (linkResponse.data?.used >= 1) {
                        wasClaimed = true;
                        console.log(
                            ` -> Previous link ${existingLinkId} was ALREADY CLAIMED (direct LNbits check).`,
                        );
                    } else {
                        console.log(
                            ` -> Previous link ${existingLinkId} was NOT claimed (direct LNbits check).`,
                        );
                    }
                } catch (checkError) {
                    if (checkError.response?.status === 404) {
                        // Link is gone from LNbits — funds were already disbursed to the user.
                        // Treat as claimed so we deduct the balance rather than attempting a refund.
                        wasClaimed = true;
                        console.log(
                            ` -> Previous link ${existingLinkId} not found in LNbits (404) — treating as claimed.`,
                        );
                    } else {
                        console.warn(
                            ` -> Could not check status of ${existingLinkId}: ${checkError.message}. Assuming not claimed for cleanup.`,
                        );
                    }
                }

                if (wasClaimed) {
                    // Fix 2: If the user claimed the LNURL without the frontend ever polling
                    // /check-lnurl-claim (e.g. they closed the tab immediately after scanning),
                    // their in-game balance was never decremented. Catch up now.
                    const processedClaimKey = `processed_claim_${existingLinkId}`;
                    if (!(await db.get(processedClaimKey))) {
                        const amountToDeduct = existingLinkFundedDetails?.amountUserCouldWithdraw;
                        if (typeof amountToDeduct === "number" && amountToDeduct > 0) {
                            await updateUserBalance(sessionId, -amountToDeduct);
                            await db.set(processedClaimKey, true);
                            console.log(
                                ` -> Deducted ${amountToDeduct} sats for silently claimed link ${existingLinkId}.`,
                            );
                        }
                    } else {
                        console.log(
                            ` -> Previous link ${existingLinkId} already claimed and balance already deducted.`,
                        );
                    }
                } else if (
                    existingLinkFundedDetails &&
                    existingLinkFundedDetails.amountOriginallyFundedToPayout > 0
                ) {
                    const amountToAttemptRefund =
                        existingLinkFundedDetails.amountOriginallyFundedToPayout;
                    console.log(
                        ` -> Attempting to REFUND ${amountToAttemptRefund} sats for UNCLAIMED link ${existingLinkId}.`,
                    );
                    try {
                        const lnbitsLinkDeleted =
                            await attemptLnbitsDeleteWithdrawLink(
                                config,
                                existingLinkId,
                            );
                        if (lnbitsLinkDeleted) {
                            // True if deleted or already gone (404)
                            const refundInvoicePayload = {
                                out: false,
                                amount: amountToAttemptRefund,
                                memo: `Refund unclaimed LNURL ${existingLinkId}`,
                            };
                            const mainWalletInvRes = await axios.post(
                                `${internalLnbitsUrl}/api/v1/payments`,
                                refundInvoicePayload,
                                {
                                    headers: {
                                        "X-Api-Key": config.lnbitsMainAdminKey,
                                        "Content-Type": "application/json",
                                    },
                                    timeout: 15000,
                                },
                            );
                            const refundPaymentRequest =
                                mainWalletInvRes.data.payment_request;

                            if (refundPaymentRequest) {
                                await axios.post(
                                    `${internalLnbitsUrl}/api/v1/payments`,
                                    { out: true, bolt11: refundPaymentRequest },
                                    {
                                        headers: {
                                            "X-Api-Key":
                                                config.lnbitsPayoutAdminKey,
                                            "Content-Type": "application/json",
                                        },
                                        timeout: 45000,
                                    },
                                );
                                console.log(
                                    ` -> REFUND SUCCESS: ${amountToAttemptRefund} sats for ${existingLinkId} moved Payout -> Main.`,
                                );
                            } else {
                                console.error(
                                    ` -> REFUND FAILED: Could not create refund invoice on Main wallet for ${existingLinkId}.`,
                                );
                            }
                        } else {
                            console.warn(
                                ` -> REFUND SKIPPED: Could not confirm deletion of old LNURL ${existingLinkId} from LNbits.`,
                            );
                        }
                    } catch (refundError) {
                        console.error(
                            ` -> REFUND ERROR for ${existingLinkId}: ${refundError.message}`,
                        );
                        if (refundError.response)
                            console.error(
                                " -> Refund Sub-Error Data:",
                                refundError.response.data,
                            );
                    }
                }
                await db.delete(activeLinkKey);
                await db.delete(existingLinkFundedDetailsKey);
                console.log(
                    ` -> Cleared DB entries for previous link ${existingLinkId}.`,
                );
            }

            const balance = await getUserBalance(sessionId);
            console.log(
                ` -> Current balance (after potential refund/cleanup): ${balance} sats`,
            );
            if (balance <= 0)
                return res.status(400).json({ error: "Insufficient balance." });

            let amountToWithdraw = balance;
            if (clientRequestedAmountStr) {
                const parsedAmount = parseInt(clientRequestedAmountStr);
                if (!isNaN(parsedAmount) && parsedAmount > 0) {
                    if (parsedAmount <= balance)
                        amountToWithdraw = parsedAmount;
                    else
                        return res
                            .status(400)
                            .json({
                                error: "Insufficient balance.",
                                details: `Requested ${parsedAmount}, available ${balance}.`,
                            });
                } else
                    console.warn(
                        ` -> Invalid amount requested (${clientRequestedAmountStr}). Withdrawing full balance.`,
                    );
            }
            if (amountToWithdraw <= 0)
                return res
                    .status(400)
                    .json({
                        error: "Invalid amount.",
                        details: "Withdrawal amount must be positive.",
                    });
            console.log(
                ` -> Determined amountToWithdraw for new LNURL: ${amountToWithdraw} sats`,
            );

            // Fix 1: Decrement balance BEFORE creating the LNURL or moving any funds.
            // This closes the race condition where two concurrent requests both read
            // the same positive balance and each fund a separate payout LNURL.
            // If anything below fails, the catch block restores the balance.
            await updateUserBalance(sessionId, -amountToWithdraw);
            balanceDecremented = true;
            amountDecremented = amountToWithdraw;
            console.log(
                ` -> Pre-decremented balance by ${amountToWithdraw} sats before funding.`,
            );

            const withdrawPayload = {
                title:
                    config.LNURL_WITHDRAW_TITLE ||
                    `Withdraw ${amountToWithdraw} sats`,
                min_withdrawable: amountToWithdraw,
                max_withdrawable: amountToWithdraw,
                uses: 1,
                wait_time: 1,
                is_unique: true,
            };
            const linkData = await attemptLnbitsWithdrawLink(
                config,
                withdrawPayload,
            );
            newGeneratedLinkId = linkData.id;
            const lnurlString = linkData.lnurl;
            console.log(
                ` -> NEW LNURL Withdraw Link generated. ID: ${newGeneratedLinkId}`,
            );

            const amountToPreFundToPayout = amountToWithdraw;
            const transferMemo = `Funding LNURL ${newGeneratedLinkId} (${amountToWithdraw}sats) for session ${sessionId.substring(0, 6)}`;

            await attemptInternalTransfer(
                config,
                amountToPreFundToPayout,
                transferMemo,
            );
            // Fix 1: Payout wallet has been funded successfully. The balance deduction
            // is now permanent and correct. If anything fails after this point we must
            // NOT restore the balance (funds are already in payout wallet) and must NOT
            // delete the LNURL (user needs it to claim their sats).
            fundingComplete = true;
            balanceDecremented = false;
            console.log(
                ` -> Funding of ${amountToPreFundToPayout} sats successful for Link ID ${newGeneratedLinkId}.`,
            );

            await db.set(getActiveLinkKey(sessionId), newGeneratedLinkId);
            await db.set(getFundedLinkDetailsKey(newGeneratedLinkId), {
                amountUserCouldWithdraw: amountToWithdraw,
                amountOriginallyFundedToPayout: amountToPreFundToPayout,
                sessionId: sessionId,
                fundedAt: Date.now(),
            });
            console.log(
                ` -> Stored NEW active link ID ${newGeneratedLinkId} and its funding details.`,
            );

            res.json({
                lnurl: lnurlString,
                link_id: newGeneratedLinkId,
                withdrawn_amount: amountToWithdraw,
            });
        } catch (error) {
            console.error(
                `--- ERROR during /generate-withdraw-lnurl for session ${sessionId.substring(0, 6)} ---`,
            );
            console.error("Error details:", error.message);

            // Fix 1: Restore balance only if we decremented it AND the payout funding
            // did not complete. If funding completed, the user's sats are in the payout
            // wallet and the balance deduction was correct.
            if (balanceDecremented) {
                console.log(
                    ` -> Restoring ${amountDecremented} sats to balance after failed withdrawal setup.`,
                );
                await updateUserBalance(sessionId, amountDecremented);
            }

            // Only delete the LNURL if the payout transfer never completed.
            // A funded LNURL must not be deleted — the user would lose their sats.
            if (newGeneratedLinkId && !fundingComplete) {
                console.log(
                    "Attempting to delete partially created LNURL from LNbits:",
                    newGeneratedLinkId,
                );
                await attemptLnbitsDeleteWithdrawLink(
                    config,
                    newGeneratedLinkId,
                );
                await db.delete(getFundedLinkDetailsKey(newGeneratedLinkId));
            }
            await db.delete(getActiveLinkKey(sessionId));

            if (!res.headersSent) {
                let userMsg = "Failed to prepare withdrawal.";
                if (error.message?.includes("insufficient funds for transfer"))
                    userMsg =
                        "Withdrawal Temporarily Unavailable (Operator Funding).";
                else if (error.message?.includes("Insufficient balance"))
                    userMsg = error.message;
                res.status(500).json({
                    error: userMsg,
                    details: error.message,
                });
            }
        }
    });

    router.get("/check-lnurl-claim/:link_id/:sessionId", async (req, res) => {
        const { link_id, sessionId } = req.params;
        const activeLinkKey = getActiveLinkKey(sessionId);
        const processedClaimKey = `processed_claim_${link_id}`; // To prevent double processing of balance deduction
        const fundedDetailsKey = getFundedLinkDetailsKey(link_id);

        if (!link_id || !sessionId)
            return res
                .status(400)
                .json({ error: "Link ID and Session ID required." });
        if (!config.lnbitsUrl || !config.lnbitsPayoutAdminKey) {
            console.error("/check-lnurl-claim error: Missing payout config.");
            return res
                .status(503)
                .json({ error: "Check service misconfigured." });
        }

        const checkUrl = `${internalLnbitsUrl}/withdraw/api/v1/links/${link_id}`;
        try {
            const response = await axios.get(checkUrl, {
                headers: {
                    "X-Api-Key": config.lnbitsPayoutAdminKey,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            });
            const linkData = response.data;

            if (linkData?.used >= 1) {
                const claimedAmount = linkData.max_withdrawable; // This is the amount defined in the LNURL
                console.log(
                    ` -> LNURL Link ${link_id} confirmed USED for ${claimedAmount} sats by session ${sessionId.substring(0, 6)}.`,
                );

                if (typeof claimedAmount === "number" && claimedAmount > 0) {
                    if (await db.get(processedClaimKey)) {
                        console.log(
                            ` -> Link ${link_id} already processed for balance deduction. Skipping balance update.`,
                        );
                    } else {
                        await updateUserBalance(sessionId, -claimedAmount); // Deduct from user's game balance
                        await db.set(processedClaimKey, true, { EX: 86400 }); // Mark as processed, expire in 1 day
                        console.log(
                            ` -> Balance updated for claim of link ${link_id}.`,
                        );
                    }

                    const storedActiveLink = await db.get(activeLinkKey);
                    if (storedActiveLink === link_id) {
                        await db.delete(activeLinkKey);
                        await db.delete(fundedDetailsKey); // Also clear its original funding details
                        console.log(
                            ` -> Cleared DB active link & funding details for ${link_id} after claim.`,
                        );
                    }
                } else {
                    console.error(
                        ` !! Could not determine valid claimed amount from link data for ${link_id}. Balance NOT updated.`,
                    );
                }
                res.json({ claimed: true, amount: claimedAmount });
            } else if (linkData) {
                // Link exists but not used
                res.json({ claimed: false });
            } else {
                // LinkData is null or undefined (shouldn't happen if API call was successful and link existed)
                console.warn(
                    ` -> LNURL Link ${link_id} not found or invalid data from LNbits (linkData undefined).`,
                );
                res.status(404).json({
                    claimed: false,
                    error: "Withdraw link not found/invalid.",
                });
            }
        } catch (error) {
            console.error(
                `Error checking LNURL link ${link_id}:`,
                error.response
                    ? `${error.response.status} ${JSON.stringify(error.response.data)}`
                    : error.message,
            );
            if (error.response?.status === 404) {
                // Link does not exist on LNbits (e.g. deleted, or never existed)
                res.json({
                    claimed: false,
                    error: "Link not found or already used/deleted by LNbits.",
                });
            } else {
                res.status(503).json({
                    claimed: false,
                    error: "Failed to check withdrawal status with LNbits.",
                });
            }
        }
    });

    return router;
};

module.exports = createWithdrawalRouter;
// --- END OF FILE backend/withdrawalRoutes.js ---
