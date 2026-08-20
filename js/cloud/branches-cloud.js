/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   BRANCHES CLOUD BRIDGE

   File:
   js/cloud/branches-cloud.js

   COMPLETE REPLACEMENT

   + Local → Firebase sync
   + Firebase → Local sync
   + Real-time branch listener
   + Multi-device support
   + Prevent sync loops
   + Acode / APK friendly
========================================== */

(function () {

    "use strict";


    /* ==========================================
       STORAGE KEY
    ========================================== */

    const BRANCHES_KEY =
        "jufelix_v7_branches";


    /* ==========================================
       STATE
    ========================================== */

    let firestoreTools =
        null;

    let syncTimer =
        null;

    let stopListener =
        null;

    let applyingCloudData =
        false;

    let cloudStarted =
        false;


    /* ==========================================
       LOAD FIRESTORE TOOLS
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


                    window.setTimeout(
                        check,
                        100
                    );
                }


                check();
            }
        );
    }


    /* ==========================================
       CLEAN DATA FOR FIRESTORE
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
       REMOVE FIREBASE-ONLY FIELDS
    ========================================== */

    function prepareCloudBranchForLocal(
        branch
    ) {

        const result = {

            ...branch

        };


        /*
         * cloudUpdatedAt is useful in Firebase,
         * but the local modules don't need it.
         *
         * It can safely remain too, but removing
         * it keeps local branch records cleaner.
         */

        delete result.cloudUpdatedAt;


        return result;
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


            if (!stored) {

                return [];
            }


            const parsed =
                JSON.parse(
                    stored
                );


            return Array.isArray(
                parsed
            )
                ? parsed
                : [];


        } catch (
            error
        ) {

            console.error(
                "Unable to read local branches:",
                error
            );


            return [];
        }
    }


    /* ==========================================
       WRITE CLOUD BRANCHES LOCALLY
    ========================================== */

    function saveCloudBranchesLocally(
        branches
    ) {

        try {

            applyingCloudData =
                true;


            localStorage.setItem(
                BRANCHES_KEY,
                JSON.stringify(
                    branches
                )
            );


            /*
             * Notify the rest of Jufelix ERP
             * that branch data changed.
             */

            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                BRANCHES_KEY,

                            value:
                                branches,

                            source:
                                "firebase"

                        }
                    }
                )

            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:dataChanged",
                    {
                        detail: {

                            key:
                                BRANCHES_KEY,

                            value:
                                branches,

                            source:
                                "firebase"

                        }
                    }
                )

            );


            console.log(
                "✅ Firebase branches saved locally:",
                branches.length
            );


            return true;


        } catch (
            error
        ) {

            console.error(
                "Unable to save Firebase branches locally:",
                error
            );


            return false;


        } finally {

            /*
             * Keep the lock through the current
             * synchronous event cycle.
             */

            window.setTimeout(
                function () {

                    applyingCloudData =
                        false;

                },
                0
            );

        }
    }


    /* ==========================================
       SAVE ONE BRANCH TO FIREBASE
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


        const branchData =
            cleanData(
                branch
            );


        await tools.setDoc(

            tools.doc(
                db,
                "branches",
                String(
                    branch.id
                )
            ),

            {

                ...branchData,

                cloudUpdatedAt:
                    tools.serverTimestamp()

            },

            {
                merge:
                    true
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
       SYNC ALL LOCAL BRANCHES TO FIREBASE
    ========================================== */

    async function syncLocal() {

        /*
         * Never upload data that has just arrived
         * from Firebase.
         */

        if (
            applyingCloudData
        ) {

            return {
                successful:
                    0,

                failed:
                    0,

                skipped:
                    true
            };
        }


        const branches =
            readBranches();


        let successful =
            0;

        let failed =
            0;


        for (
            const branch of branches
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
            "✅ Local branch Firebase sync finished:",
            {
                successful:
                    successful,

                failed:
                    failed
            }
        );


        return {

            successful:
                successful,

            failed:
                failed

        };
    }


    /* ==========================================
       FIREBASE → LOCAL REAL-TIME LISTENER
    ========================================== */

    async function startListener() {

        if (
            stopListener
        ) {

            return true;
        }


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        console.log(
            "☁️ Starting real-time Firebase branch listener..."
        );


        stopListener =
            tools.onSnapshot(

                tools.collection(
                    db,
                    "branches"
                ),


                function (
                    snapshot
                ) {

                    const cloudBranches =
                        [];


                    snapshot.forEach(
                        function (
                            documentSnapshot
                        ) {

                            const data =
                                documentSnapshot.data() ||
                                {};


                            /*
                             * Always guarantee an ID.
                             *
                             * If the Firebase document
                             * doesn't contain id internally,
                             * use its document ID.
                             */

                            const branch = {

                                ...data,

                                id:
                                    data.id ||
                                    documentSnapshot.id

                            };


                            cloudBranches.push(

                                prepareCloudBranchForLocal(
                                    branch
                                )

                            );

                        }
                    );


                    cloudBranches.sort(
                        function (
                            a,
                            b
                        ) {

                            const firstName =
                                String(
                                    a.branchName ||
                                    a.name ||
                                    ""
                                );


                            const secondName =
                                String(
                                    b.branchName ||
                                    b.name ||
                                    ""
                                );


                            return firstName.localeCompare(
                                secondName
                            );

                        }
                    );


                    /*
                     * Firebase is now the shared source
                     * of truth for branches.
                     */

                    saveCloudBranchesLocally(
                        cloudBranches
                    );


                    console.log(
                        "✅ Branches received from Firebase:",
                        cloudBranches.length
                    );

                },


                function (
                    error
                ) {

                    console.error(
                        "❌ Firebase branch listener error:",
                        error
                    );

                }

            );


        return true;
    }


    /* ==========================================
       STOP LISTENER
    ========================================== */

    function stopCloudListener() {

        if (
            typeof stopListener ===
            "function"
        ) {

            stopListener();

        }


        stopListener =
            null;
    }


    /* ==========================================
       DELAYED LOCAL → CLOUD SYNC
    ========================================== */

    function scheduleSync() {

        if (
            applyingCloudData
        ) {

            return;
        }


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
       LOCAL DATA CHANGE EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (
            event
        ) {

            if (
                applyingCloudData
            ) {

                return;
            }


            if (
                event.detail &&
                event.detail.key ===
                    BRANCHES_KEY
            ) {

                scheduleSync();
            }

        }
    );


    document.addEventListener(
        "jufelix:dataChanged",
        function (
            event
        ) {

            if (
                applyingCloudData
            ) {

                return;
            }


            if (
                event.detail &&
                event.detail.key ===
                    BRANCHES_KEY
            ) {

                scheduleSync();
            }

        }
    );


    /*
     * This fires when another browser tab/window
     * changes localStorage.
     */

    window.addEventListener(
        "storage",
        function (
            event
        ) {

            if (
                applyingCloudData
            ) {

                return;
            }


            if (
                event.key ===
                    BRANCHES_KEY
            ) {

                scheduleSync();
            }

        }
    );


    /* ==========================================
       START CLOUD BRIDGE
    ========================================== */

    async function startCloud() {

        if (
            cloudStarted
        ) {

            return true;
        }


        cloudStarted =
            true;


        try {

            /*
             * STEP 1
             *
             * Upload this device's existing
             * branches first.
             *
             * This protects older local branch
             * records when cloud sync is enabled
             * for the first time.
             */

            await syncLocal();


            /*
             * STEP 2
             *
             * Start real-time Firebase → local
             * synchronization.
             */

            await startListener();


            console.log(
                "✅ Jufelix Branches two-way cloud sync started."
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:branches-cloud-ready"
                )

            );


            return true;


        } catch (
            error
        ) {

            cloudStarted =
                false;


            console.error(
                "❌ Branch cloud startup failed:",
                error
            );


            /*
             * Retry automatically.
             */

            window.setTimeout(
                function () {

                    startCloud();

                },
                3000
            );


            return false;
        }
    }


    /* ==========================================
       PUBLIC API
    ========================================== */

    window.JufelixBranchesCloud = {

        saveBranch:
            saveBranch,


        syncLocal:
            syncLocal,


        listen:
            startListener,


        stop:
            stopCloudListener,


        refresh:
            async function () {

                await syncLocal();

                await startListener();

                return true;
            }

    };


    console.log(
        "✅ JufelixBranchesCloud API loaded."
    );


    /* ==========================================
       AUTO START
    ========================================== */

    window.setTimeout(
        function () {

            startCloud();

        },
        500
    );


})();