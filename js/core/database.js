/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   DATABASE LAYER

   File:
   js/core/database.js
========================================== */

(function () {

    "use strict";

    let ready = false;


    function getMode() {
        return "localStorage";
    }


    function isReady() {
        return ready;
    }


    function get(table) {

        try {

            const saved =
                localStorage.getItem(
                    table
                );

            if (!saved) {
                return [];
            }

            const parsed =
                JSON.parse(saved);

            return Array.isArray(parsed)
                ? parsed
                : [];

        } catch (error) {

            console.error(
                "Database read error:",
                table,
                error
            );

            return [];
        }
    }


    function save(table, data) {

        if (!Array.isArray(data)) {
            return false;
        }

        try {

            localStorage.setItem(
                table,
                JSON.stringify(data)
            );

            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {
                            key: table,
                            value: data
                        }
                    }
                )
            );

            return true;

        } catch (error) {

            console.error(
                "Database save error:",
                table,
                error
            );

            return false;
        }
    }


    function insert(table, record) {

        if (
            !record ||
            typeof record !== "object" ||
            Array.isArray(record)
        ) {
            return null;
        }

        const rows =
            get(table);

        const now =
            new Date().toISOString();

        const newRecord = {
            ...record,

            id:
                record.id ||
                generateId(),

            createdAt:
                record.createdAt ||
                now,

            updatedAt:
                now
        };

        rows.push(
            newRecord
        );

        if (!save(table, rows)) {
            return null;
        }

        return newRecord;
    }


    function update(
        table,
        id,
        updates
    ) {

        const rows =
            get(table);

        const index =
            rows.findIndex(
                function (row) {
                    return (
                        String(row.id) ===
                        String(id)
                    );
                }
            );

        if (index === -1) {
            return false;
        }

        rows[index] = {
            ...rows[index],
            ...updates,

            id:
                rows[index].id,

            updatedAt:
                new Date().toISOString()
        };

        return save(
            table,
            rows
        );
    }


    function remove(
        table,
        id
    ) {

        const rows =
            get(table);

        const filtered =
            rows.filter(
                function (row) {
                    return (
                        String(row.id) !==
                        String(id)
                    );
                }
            );

        if (
            filtered.length ===
            rows.length
        ) {
            return false;
        }

        return save(
            table,
            filtered
        );
    }


    function findById(
        table,
        id
    ) {

        return (
            get(table).find(
                function (row) {
                    return (
                        String(row.id) ===
                        String(id)
                    );
                }
            ) ||
            null
        );
    }


    function filter(
        table,
        callback
    ) {

        const rows =
            get(table);

        if (
            typeof callback !==
            "function"
        ) {
            return rows;
        }

        return rows.filter(
            callback
        );
    }


    function generateId() {

        return (
            "db-" +
            Date.now().toString(36) +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 9)
        );
    }


    function initialize() {

        try {

            const testKey =
                "__jufelix_database_test__";

            localStorage.setItem(
                testKey,
                "ready"
            );

            localStorage.removeItem(
                testKey
            );

            ready = true;

            return true;

        } catch (error) {

            console.error(
                "Database initialization failed:",
                error
            );

            ready = false;

            return false;
        }
    }


    window.JufelixDatabase = {

        initialize:
            initialize,

        isReady:
            isReady,

        getMode:
            getMode,

        get:
            get,

        save:
            save,

        insert:
            insert,

        update:
            update,

        delete:
            remove,

        remove:
            remove,

        findById:
            findById,

        filter:
            filter,

        generateId:
            generateId
    };


    /*
     * Compatibility alias for modules
     * that already use Database.
     */

    window.Database =
        window.JufelixDatabase;


    initialize();


    console.log(
        "Jufelix Database ready:",
        window.JufelixDatabase.isReady()
    );

})();