import { type Request, type Response } from 'express';
import { pool } from '../config/db.js';

/**
 * Submit a new contact request.
 * MIXED: Works for both logged-in and anonymous users.
 */
export const createContactRequest = async (req: Request, res: Response) => {
    const { Name, Email, Subject, Message } = req.body;
    
    // Use the UserId from the token if it exists (soft auth), otherwise null
    const userId = req.user?.userId || null;

    // Validation
    if (!Name || !Email || !Message) {
        return res.status(400).send("Missing required fields: Name, Email, and Message are mandatory.");
    }

    try {
        const query = `
            INSERT INTO "ContactRequests" (
                "Name", "Email", "Subject", "Message", "UserId", "Status", "CreatedAt"
            )
            VALUES ($1, $2, $3, $4, $5, 'new', NOW())
            RETURNING "RequestId";
        `;

        const values = [Name, Email, Subject || 'No Subject', Message, userId];
        const { rows } = await pool.query(query, values);

        return res.status(201).json({ 
            success: true, 
            message: "Inquiry received.", 
            requestId: rows[0].RequestId || rows[0].requestid 
        });
    } catch (error) {
        console.error(`Error creating contact request: ${error}`);
        return res.status(500).send("Internal server error occurred while sending message.");
    }
};

/**
 * Get contact requests.
 * PROTECTED: Admin-only logic usually applies here.
 */
export const getContactRequests = async (req: Request, res: Response) => {
    // Basic implementation: if a specific ID is provided, get one, else get all
    const requestId = req.query.id;

    try {
        let query: string;
        let values: any[] = [];

        if (requestId) {
            query = `
                SELECT cr.*, u."DisplayName" as "UserAccountName"
                FROM "ContactRequests" cr
                LEFT JOIN "Users" u ON cr."UserId" = u."UserId"
                WHERE cr."RequestId" = $1
            `;
            values = [requestId];
        } else {
            query = `
                SELECT cr.*, u."DisplayName" as "UserAccountName"
                FROM "ContactRequests" cr
                LEFT JOIN "Users" u ON cr."UserId" = u."UserId"
                ORDER BY cr."CreatedAt" DESC
            `;
        }

        const { rows } = await pool.query(query, values);

        if (requestId && rows.length === 0) {
            return res.status(404).send("Request not found.");
        }

        return res.status(200).json(rows);
    } catch (error) {
        console.error(`Error fetching contact requests: ${error}`);
        return res.status(500).send("Internal server error.");
    }
};

/**
 * Delete a contact request.
 * PROTECTED: Requires authenticateToken.
 */
export const deleteContactRequest = async (req: Request, res: Response) => {
    const requestId = req.query.id;

    if (!requestId) {
        return res.status(400).send("Request ID is required for deletion.");
    }

    try {
        const deleteQuery = `DELETE FROM "ContactRequests" WHERE "RequestId" = $1 RETURNING *`;
        const { rows } = await pool.query(deleteQuery, [requestId]);

        if (rows.length === 0) {
            return res.status(404).send("Contact request not found.");
        }

        return res.status(200).send("Contact request purged successfully.");
    } catch (error) {
        console.error(`Error deleting contact request: ${error}`);
        return res.status(500).send("Internal server error during deletion.");
    }
};

/**
 * Update the status of a contact request (e.g., mark as resolved).
 * PROTECTED: Admin only.
 */
export const updateContactStatus = async (req: Request, res: Response) => {
    const requestId = req.query.id;
    const { Status } = req.body;

    const validStatuses = ['new', 'in_progress', 'resolved', 'spam'];
    if (!validStatuses.includes(Status)) {
        return res.status(400).send("Invalid status provided.");
    }

    try {
        const query = `
            UPDATE "ContactRequests" 
            SET "Status" = $1 
            WHERE "RequestId" = $2 
            RETURNING *
        `;
        const { rows } = await pool.query(query, [Status, requestId]);

        if (rows.length === 0) {
            return res.status(404).send("Request not found.");
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`Error updating contact status: ${error}`);
        return res.status(500).send("Internal server error.");
    }
};