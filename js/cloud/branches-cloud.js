/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   BRANCHES CLOUD BRIDGE

   File:
   js/cloud/branches-cloud.js

   Version: 800

   + Local → Firebase sync
   + Firebase → Local realtime sync
   + Safe multi-device merge
   + Preserves branch IDs
   + Protects Head Office
   + Prevents duplicate branches
   + Prevents sync loops
   + Acode / APK friendly
========================================== */

(function () {

    "use strict";


    /* ==========================================
       CONSTANTS
    ========================================== */

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const COLLECTION_NAME =
        "branches";

    const HEAD_OFFICE_ID =
        "head-office";


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
       FIRESTORE TOOLS
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
            function (resolve, reject) {

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
       CLEAN FIRESTORE DATA
    ========================================== */

    function cleanData(value) {

        if (
            value === undefined
        ) {
            return null;
        }

        if (
            value === null ||
            typeof value !== "object"
        ) {
            return value;
        }

        if (
            Array.isArray(value)
        ) {

            return value.map(
                cleanData
            );
        }

        const result = {};

        Object.keys(value)
            .forEach(
                function (key) {

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
       NORMALIZE BRANCH
    ========================================== */

    function normalizeBranch(
        branch
    ) {

        const source =
            branch &&
            typeof branch === "object"
                ? branch
                : {};

        const id =
            String(
                source.id ||
                source.branchId ||
                ""
            ).trim();

        const name =
            String(
                source.branchName ||
                source.name ||
                (
                    id === HEAD_OFFICE_ID
                        ? "Head Office"
                        : ""
                )
            ).trim();

        const normalized = {

            ...source,

            id:
                id,

            branchName:
                name,

            name:
                name
        };


        delete normalized.cloudUpdatedAt;


        if (
            id === HEAD_OFFICE_ID ||
            source.isHeadOffice === true ||
            source.type === "head-office"
        ) {

            normalized.id =
                HEAD_OFFICE_ID;

            normalized.branchName =
                name ||
                "Head Office";

            normalized.name =
                normalized.branchName;

            normalized.code =
                source.code ||
                "HO";

            normalized.type =
                "head-office";

            normalized.isHeadOffice =
                true;

            normalized.status =
                source.status ||
                "active";
        }


        return normalized;
    }


    /* ==========================================
       HEAD OFFICE
    ========================================== */

    function createHeadOffice() {

        return {

            id:
                HEAD_OFFICE_ID,

            name:
                "Head Office",

            branchName:
                "Head Office",

            code:
                "HO",

            type:
                "head-office",

            status:
                "active",

            isHeadOffice:
                true
        };
    }


    function ensureHeadOffice(
        branches
    ) {

        const list =
            Array.isArray(branches)
                ? branches.map(
                    normalizeBranch
                )
                : [];


        const index =
            list.findIndex(
                function (branch) {

                    return (
                        branch.id ===
                            HEAD_OFFICE_ID ||
                        branch.isHeadOffice ===
                            true ||
                        branch.type ===
                            "head-office"
                    );
                }
            );


        if (
            index === -1
        ) {

            list.unshift(
                createHeadOffice()
            );

        } else {

            list[index] = {

                ...list[index],

                id:
                    HEAD_OFFICE_ID,

                name:
                    list[index].name ||
                    list[index].branchName ||
                    "Head Office",

                branchName:
                    list[index].branchName ||
                    list[index].name ||
                    "Head Office",

                code:
                    list[index].code ||
                    "HO",

                type:
                    "head-office",

                status:
                    list[index].status ||
                    "active",

                isHeadOffice:
                    true
            };
        }


        return list;
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

                return [
                    createHeadOffice()
                ];
            }


            const parsed =
                JSON.parse(
                    stored
                );


            if (
                !Array.isArray(parsed)
            ) {

                return [
                    createHeadOffice()
                ];
            }


            return ensureHeadOffice(
                parsed
            );


        } catch (error) {

            console.error(
                "Unable to read local branches:",
                error
            );


            return [
                createHeadOffice()
            ];
        }
    }


    /* ==========================================
       REMOVE DUPLICATES
    ========================================== */

    function removeDuplicateBranches(
        branches
    ) {

        const map =
            new Map();


        (
            Array.isArray(branches)
                ? branches
                : []
        ).forEach(
            function (branch) {

                const normalized =
                    normalizeBranch(
                        branch
                    );


                if (
                    !normalized.id
                ) {
                    return;
                }


                const id =
                    String(
                        normalized.id
                    );


                const existing =
                    map.get(id);


                if (!existing) {

                    map.set(
                        id,
                        normalized
                    );

                    return;
                }


                map.set(
                    id,
                    {
                        ...existing,
                        ...normalized,
                        id:
                            id
                    }
                );
            }
        );


        return ensureHeadOffice(
            Array.from(
                map.values()
            )
        );
    }


    /* ==========================================
       SAFE LOCAL + CLOUD MERGE
    ========================================== */

    function mergeBranchesSafely(
        localBranches,
        cloudBranches
    ) {

        const branchMap =
            new Map();


        /*
         * Start with local branches.
         */

        removeDuplicateBranches(
            localBranches
        ).forEach(
            function (branch) {

                branchMap.set(
                    String(branch.id),
                    {
                        ...branch
                    }
                );
            }
        );


        /*
         * Merge cloud branches by ID.
         *
         * Cloud values win when the same
         * branch exists on both devices.
         */

        removeDuplicateBranches(
            cloudBranches
        ).forEach(
            function (cloudBranch) {

                const id =
                    String(
                        cloudBranch.id
                    );


                const localBranch =
                    branchMap.get(id) ||
                    {};


                branchMap.set(
                    id,
                    normalizeBranch({
                        ...localBranch,
                        ...cloudBranch,
                        id:
                            id
                    })
                );
            }
        );


        let result =
            Array.from(
                branchMap.values()
            );


        result =
            removeDuplicateBranches(
                result
            );


        /*
         * Head Office first.
         * Other branches alphabetically.
         */

        result.sort(
            function (a, b) {

                if (
                    a.id ===
                    HEAD_OFFICE_ID
                ) {
                    return -1;
                }

                if (
                    b.id ===
                    HEAD_OFFICE_ID
                ) {
                    return 1;
                }


                return String(
                    a.branchName ||
                    a.name ||
                    ""
                ).localeCompare(
                    String(
                        b.branchName ||
                        b.name ||
                        ""
                    )
                );
            }
        );


        return result;
    }


    /* ==========================================
       SAVE LOCALLY
    ========================================== */

    function saveCloudBranchesLocally(
        branches
    ) {

        try {

            applyingCloudData =
                true;


            const safeBranches =
                removeDuplicateBranches(
                    branches
                );


            localStorage.setItem(
                BRANCHES_KEY,
                JSON.stringify(
                    safeBranches
                )
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                BRANCHES_KEY,

                            value:
                                safeBranches,

                            source:
                                "cloud"
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
                                safeBranches,

                            source:
                                "cloud"
                        }
                    }
                )
            );


            console.log(
                "✅ Branches saved locally:",
                safeBranches.length
            );


            return true;


        } catch (error) {

            console.error(
                "Unable to save branches locally:",
                error
            );

            return false;


        } finally {

            window.setTimeout(
                function () {

                    applyingCloudData =
                        false;
                },
                50
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


        const normalized =
            normalizeBranch(
                branch
            );


        const branchData =
            cleanData(
                normalized
            );


        await tools.setDoc(

            tools.doc(
                db,
                COLLECTION_NAME,
                String(
                    normalized.id
                )
            ),

            {

                ...branchData,

                id:
                    String(
                        normalized.id
                    ),

                cloudUpdatedAt:
                    tools.serverTimestamp()
            },

            {
                merge:
                    true
            }
        );


        console.log(
            "✅ Branch synced:",
            normalized.branchName ||
            normalized.id
        );


        return true;
    }


    /* ==========================================
       LOCAL → FIREBASE
    ========================================== */

    async function syncLocal() {

        if (
            applyingCloudData
        ) {

            return {
                successful: 0,
                failed: 0,
                skipped: true
            };
        }


        const branches =
            removeDuplicateBranches(
                readBranches()
            );


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


            } catch (error) {

                failed++;


                console.error(
                    "❌ Branch sync failed:",
                    branch.id,
                    error
                );
            }
        }


        console.log(
            "☁️ Branch sync result:",
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
       FIREBASE → LOCAL LISTENER
    ========================================== */

    async function startListener() {

        if (
            typeof stopListener ===
            "function"
        ) {

            return true;
        }


        const db =
            await waitForFirebase();


        const tools =
            await getFirestoreTools();


        console.log(
            "☁️ Starting branch realtime listener..."
        );


        stopListener =
            tools.onSnapshot(

                tools.collection(
                    db,
                    COLLECTION_NAME
                ),

                function (snapshot) {

                    const cloudBranches =
                        [];


                    snapshot.forEach(
                        function (
                            documentSnapshot
                        ) {

                            const data =
                                documentSnapshot.data() ||
                                {};


                            cloudBranches.push(
                                normalizeBranch({

                                    ...data,

                                    id:
                                        String(
                                            data.id ||
                                            documentSnapshot.id
                                        )
                                })
                            );
                        }
                    );


                    const localBranches =
                        readBranches();


                    const mergedBranches =
                        mergeBranchesSafely(
                            localBranches,
                            cloudBranches
                        );


                    saveCloudBranchesLocally(
                        mergedBranches
                    );


                    console.log(
                        "✅ Firebase branch update:",
                        mergedBranches.length
                    );
                },

                function (error) {

                    console.error(
                        "❌ Branch realtime listener failed:",
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
       SCHEDULE SYNC
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
                            function (error) {

                                console.error(
                                    "Branch scheduled sync failed:",
                                    error
                                );
                            }
                        );
                },
                350
            );
    }


    /* ==========================================
       LOCAL CHANGE EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (event) {

            if (
                applyingCloudData
            ) {
                return;
            }


            const detail =
                event.detail ||
                {};


            if (
                detail.source ===
                "cloud" ||
                detail.source ===
                "firebase"
            ) {
                return;
            }


            if (
                detail.key ===
                BRANCHES_KEY
            ) {

                scheduleSync();
            }
        }
    );


    document.addEventListener(
        "jufelix:dataChanged",
        function (event) {

            if (
                applyingCloudData
            ) {
                return;
            }


            const detail =
                event.detail ||
                {};


            if (
                detail.source ===
                "cloud" ||
                detail.source ===
                "firebase"
            ) {
                return;
            }


            if (
                detail.key ===
                BRANCHES_KEY
            ) {

                scheduleSync();
            }
        }
    );


    window.addEventListener(
        "storage",
        function (event) {

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
       START CLOUD
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
             * Upload existing local branches.
             */

            await syncLocal();


            /*
             * Then listen for all devices.
             */

            await startListener();


            console.log(
                "✅ Jufelix Branches Cloud v800 ready."
            );


            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:branches-cloud-ready"
                )
            );


            return true;


        } catch (error) {

            cloudStarted =
                false;


            console.error(
                "❌ Branch cloud startup failed:",
                error
            );


            window.setTimeout(
                startCloud,
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

        getLocal:
            readBranches,

        refresh:
            async function () {

                await syncLocal();

                await startListener();

                return true;
            }
    };


    console.log(
        "✅ JufelixBranchesCloud v800 API loaded."
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