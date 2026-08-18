/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   BRANCHES CLOUD BRIDGE

   File:
   js/cloud/branches-cloud.js

   + Sync branches to Firestore
   + Upload existing local branches
   + Listen for branch data changes
   + Acode-friendly classic script
========================================== */

(function () {
    "use strict";


    const BRANCHES_KEY =
        "jufelix_v7_branches";


    let firestoreTools =
        null;

    let syncTimer =
        null;


    /* ==========================================
       LOAD FIRESTORE
    ========================================== */

    async function getFirestoreTools() {

        if (firestoreTools) {
            return firestoreTools;
        }


        firestoreTools =
            await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            );


        return firestoreTools;
    }


    /* ==========================================
       WAIT FOR FIREBASE
    ========================================== */

    function waitForFirebase(
        timeout = 15000
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const started =
                    Date.now();


                function check() {

                    if (
                        window.JufelixFirebase &&
                        window.JufelixFirebase.db
                    ) {

                        resolve(
                            window.JufelixFirebase.db
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Firebase database was not ready."
                            )
                        );

                        return;
                    }


                    setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    /* ==========================================
       CLEAN DATA
    ========================================== */

    function cleanData(
        value
    ) {

        if (
            value === undefined
        ) {
            return null;
        }


        if (
            value === null ||
            typeof value !==
                "object"
        ) {
            return value;
        }


        if (
            Array.isArray(
                value
            )
        ) {

            return value.map(
                cleanData
            );
        }


        const result = {};


        Object.keys(
            value
        ).forEach(
            function (
                key
            ) {

                if (
                    value[key] !==
                    undefined
                ) {

                    result[key] =
                        cleanData(
                            value[key]
                        );
                }
            }
        );


        return result;
    }


    /* ==========================================
       SAVE ONE BRANCH
    ========================================== */

    async function saveBranch(
        branch
    ) {

        if (
            !branch ||
            !branch.id
        ) {

            throw new Error(
                "Branch ID is missing."
            );
        }


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        await tools.setDoc(

            tools.doc(
                db,
                "branches",
                String(
                    branch.id
                )
            ),

            {
                ...cleanData(
                    branch
                ),

                cloudUpdatedAt:
                    tools.serverTimestamp()
            },

            {
                merge: true
            }
        );


        console.log(
            "✅ Branch synced to Firebase:",
            branch.branchName ||
            branch.name ||
            branch.id
        );


        return true;
    }


    /* ==========================================
       READ LOCAL BRANCHES
    ========================================== */

    function readBranches() {

        try {

            const stored =
                localStorage.getItem(
                    BRANCHES_KEY
                );


            const parsed =
                stored
                    ? JSON.parse(
                        stored
                    )
                    : [];


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (
            error
        ) {

            console.error(
                "Unable to read branches:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       SYNC ALL LOCAL BRANCHES
    ========================================== */

    async function syncLocal() {

        const branches =
            readBranches();


        let successful = 0;
        let failed = 0;


        for (
            const branch of
            branches
        ) {

            if (
                !branch ||
                !branch.id
            ) {
                continue;
            }


            try {

                await saveBranch(
                    branch
                );


                successful++;


            } catch (
                error
            ) {

                failed++;


                console.error(
                    "❌ Branch sync failed:",
                    branch.id,
                    error
                );
            }
        }


        console.log(
            "Branch Firebase sync:",
            {
                successful,
                failed
            }
        );


        return {
            successful,
            failed
        };
    }


    /* ==========================================
       DELAYED SYNC
    ========================================== */

    function scheduleSync() {

        window.clearTimeout(
            syncTimer
        );


        syncTimer =
            window.setTimeout(
                function () {

                    syncLocal()
                        .catch(
                            function (
                                error
                            ) {

                                console.error(
                                    "Branch scheduled sync failed:",
                                    error
                                );
                            }
                        );

                },
                500
            );
    }


    /* ==========================================
       DATA CHANGE EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (
            event
        ) {

            if (
                event.detail &&
                event.detail.key ===
                    BRANCHES_KEY
            ) {

                scheduleSync();
            }
        }
    );


    window.addEventListener(
        "storage",
        function (
            event
        ) {

            if (
                event.key ===
                BRANCHES_KEY
            ) {

                scheduleSync();
            }
        }
    );


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixBranchesCloud = {

        saveBranch:
            saveBranch,

        syncLocal:
            syncLocal,

        refresh:
            scheduleSync
    };


    console.log(
        "✅ Jufelix Branches Cloud loaded."
    );


    /* ==========================================
       INITIAL LOCAL → FIREBASE SYNC
    ========================================== */

    window.setTimeout(
        function () {

            syncLocal()
                .catch(
                    function (
                        error
                    ) {

                        console.error(
                            "Initial branch Firebase sync failed:",
                            error
                        );
                    }
                );

        },
        1500
    );

})();