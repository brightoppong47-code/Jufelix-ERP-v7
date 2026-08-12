/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   Transfer Service
   File: js/services/transfer.service.js
========================================== */

const TransferService = {

    getAll() {
        return dbGet(DB.TRANSFERS);
    },

    saveAll(transfers) {
        dbSave(DB.TRANSFERS, transfers);
    },

    nextNumber() {
        const transfers = this.getAll();
        const nextNumber = transfers.length + 1;

        return "TRF-" +
            String(nextNumber).padStart(6, "0");
    },

    create(record) {
        if (!record) {
            throw new Error("Transfer data is required.");
        }

        const quantity = Number(record.quantity);

        if (!record.date) {
            throw new Error("Transfer date is required.");
        }

        if (!record.fromBranchId) {
            throw new Error("Source branch is required.");
        }

        if (!record.toBranchId) {
            throw new Error("Destination branch is required.");
        }

        if (
            String(record.fromBranchId) ===
            String(record.toBranchId)
        ) {
            throw new Error(
                "Source and destination branches cannot be the same."
            );
        }

        if (!record.productId) {
            throw new Error("Product is required.");
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(
                "Transfer quantity must be greater than zero."
            );
        }

        const transfers = this.getAll();

        const transfer = {
            id: this.nextNumber(),
            transferNumber: this.nextNumber(),

            date: record.date,

            fromBranchId: String(record.fromBranchId),
            fromBranchName:
                record.fromBranchName || "Unknown Branch",

            toBranchId: String(record.toBranchId),
            toBranchName:
                record.toBranchName || "Unknown Branch",

            productId: String(record.productId),
            productName:
                record.productName || "Unknown Product",

            quantity: quantity,

            unit: record.unit || "",

            notes: record.notes || "",

            status:
                String(record.status || "completed")
                    .toLowerCase(),

            createdBy:
                record.createdBy || "Unknown User",

            createdAt:
                new Date().toISOString()
        };

        transfers.push(transfer);

        this.saveAll(transfers);

        document.dispatchEvent(
            new CustomEvent(
                "jufelix:dataChanged",
                {
                    detail: {
                        module: "transfers",
                        action: "created",
                        record: transfer
                    }
                }
            )
        );

        return transfer;
    }

};