/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   AUTHENTICATED BRANCHES CLOUD BRIDGE

   COMPLETE REPLACEMENT

   File:
   js/cloud/branches-cloud.js

   Version: 801

   + Firebase Authentication aware
   + Local → Firebase branch sync
   + Firebase → Local realtime sync
   + Multi-device support
   + Safe branch merge
   + Prevents sync loops
   + Preserves Head Office
   + Preserves branch IDs
   + APK / Acode friendly
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
       AUTHENTICATED FIREBASE READY

       IMPORTANT FIX:
       We wait for Firebase Authentication,
       not only Firestore database existence.
    ========================================== */

    async function getFirebase() {

        /*
         * Preferred helper from:
         * js/core/firebase.js
         */

        if (
            typeof window
                .waitForJufelixFirebase ===
            "function"
        ) {

            const firebase =
                await window
                    .waitForJufelixFirebase({

                        requireUser:
                            true,

                        timeout:
                            20000
                    });


            if (
                !firebase ||
                !firebase.db
            ) {

                throw new Error(
                    "Firebase database is unavailable."
                );
            }


            if (
                !firebase.auth ||
                !firebase.auth.currentUser
            ) {

                throw new Error(
                    "Firebase Authentication user is not signed in."
                );
            }


            return firebase;
        }


        /*
         * Compatibility fallback.
         */

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const startedAt =
                    Date.now();


                function check() {

                    const firebase =
                        window
                            .JufelixFirebase;


                    if (
                        firebase &&
                        firebase.error
                    ) {

                        reject(
                            firebase.error
                        );

                        return;
                    }


                    if (
                        firebase &&
                        firebase.db &&
                        firebase.auth &&
                        firebase.auth.currentUser
                    ) {

                        resolve(
                            firebase
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        startedAt >=
                        20000
                    ) {

                        reject(
                            new Error(
                                "Firebase Authentication did not become ready."
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


        const result =
            {};


        Object.keys(
            value
        ).forEach(
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
            typeof branch ===
                "object"
                ? branch
                : {};


        let id =
            String(
                source.id ||
                source.branchId ||
                ""
            ).trim();


        let name =
            String(
                source.branchName ||
                source.name ||
                ""
            ).trim();


        const isHeadOffice =

            id ===
                HEAD_OFFICE_ID ||

            source.isHeadOffice ===
                true ||

            String(
                source.type ||
                ""
            ).toLowerCase() ===
                "head-office";


        if (
            isHeadOffice
        ) {

            id =
                HEAD_OFFICE_ID;


            if (!name) {

                name =
                    "Head Office";
            }
        }


        const normalized = {

            ...source,

            id:
                id,

            branchName:
                name,

            name:
                name
        };


        delete normalized
            .cloudUpdatedAt;


        if (
            isHeadOffice
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

            branchName:
                "Head Office",

            name:
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
        branchList
    ) {

        let branches =
            Array.isArray(
                branchList
            )
                ? branchList
                    .map(
                        normalizeBranch
                    )
                : [];


        let headOfficeIndex =
            branches.findIndex(
                function (branch) {

                    return (

                        String(
                            branch.id
                        ) ===
                            HEAD_OFFICE_ID ||

                        branch
                            .isHeadOffice ===
                            true ||

                        String(
                            branch.type ||
                            ""
                        ).toLowerCase() ===
                            "head-office"
                    );
                }
            );


        if (
            headOfficeIndex ===
            -1
        ) {

            branches.unshift(
                createHeadOffice()
            );

        } else {

            branches[
                headOfficeIndex
            ] =
                normalizeBranch({

                    ...branches[
                        headOfficeIndex
                    ],

                    id:
                        HEAD_OFFICE_ID,

                    isHeadOffice:
                        true,

                    type:
                        "head-office"
                });
        }


        return branches;
    }


    /* ==========================================
       LOCAL STORAGE
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
                !Array.isArray(
                    parsed
                )
            ) {

                return [
                    createHeadOffice()
                ];
            }


            return removeDuplicates(
                ensureHeadOffice(
                    parsed
                )
            );


        } catch (error) {

            console.error(
                "Unable to read branches:",
                error
            );


            return [
                createHeadOffice()
            ];
        }
    }


    function saveBranchesLocally(
        branches,
        source
    ) {

        const safeBranches =
            removeDuplicates(
                ensureHeadOffice(
                    branches
                )
            );


        try {

            applyingCloudData =
                source ===
                "cloud";


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
                                source ||
                                ""
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
                                source ||
                                ""
                        }
                    }
                )
            );


            console.log(
                "✅ Branches stored locally:",
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

            if (
                source ===
                "cloud"
            ) {

                window.setTimeout(
                    function () {

                        applyingCloudData =
                            false;

                    },
                    100
                );
            }
        }
    }


    /* ==========================================
       REMOVE DUPLICATES
    ========================================== */

    function removeDuplicates(
        branches
    ) {

        const map =
            new Map();


        (
            Array.isArray(
                branches
            )
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
                    map.get(
                        id
                    );


                map.set(
                    id,
                    {

                        ...(
                            existing ||
                            {}
                        ),

                        ...normalized,

                        id:
                            id
                    }
                );
            }
        );


        let result =
            Array.from(
                map.values()
            );


        result =
            ensureHeadOffice(
                result
            );


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
       SAFE CLOUD + LOCAL MERGE
    ========================================== */

    function mergeBranchesSafely(
        localBranches,
        cloudBranches
    ) {

        const map =
            new Map();


        removeDuplicates(
            localBranches
        )
            .forEach(
                function (
                    branch
                ) {

                    map.set(
                        String(
                            branch.id
                        ),

                        {
                            ...branch
                        }
                    );
                }
            );


        removeDuplicates(
            cloudBranches
        )
            .forEach(
                function (
                    cloudBranch
                ) {

                    const id =
                        String(
                            cloudBranch.id
                        );


                    const localBranch =
                        map.get(
                            id
                        ) ||
                        {};


                    /*
                     * Cloud copy wins for fields
                     * already shared to Firebase.
                     */

                    map.set(
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


        return removeDuplicates(
            Array.from(
                map.values()
            )
        );
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


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        const normalized =
            normalizeBranch(
                branch
            );


        if (
            !normalized.id
        ) {

            throw new Error(
                "Branch ID is invalid."
            );
        }


        console.log(
            "☁️ Uploading branch:",
            normalized.branchName ||
            normalized.id
        );


        try {

            await tools.setDoc(

                tools.doc(
                    firebase.db,
                    COLLECTION_NAME,
                    String(
                        normalized.id
                    )
                ),

                {

                    ...cleanData(
                        normalized
                    ),

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
                "✅ BRANCH SAVED TO FIREBASE:",
                normalized.branchName ||
                normalized.id
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:branch-cloud-saved",
                    {
                        detail: {

                            branch:
                                normalized
                        }
                    }
                )
            );


            return true;


        } catch (error) {

            console.error(
                "❌ BRANCH FIREBASE SAVE FAILED:",
                error
            );


            showCloudError(
                error
            );


            throw error;
        }
    }


    /* ==========================================
       SYNC EXISTING LOCAL BRANCHES
    ========================================== */

    async function syncLocal() {

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


        await getFirebase();


        const branches =
            readBranches();


        let successful =
            0;

        let failed =
            0;


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


            } catch (error) {

                failed++;


                console.error(
                    "Branch sync failed:",
                    branch.id,
                    error
                );
            }
        }


        console.log(
            "☁️ Branch local sync finished:",
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
       REALTIME FIREBASE LISTENER
    ========================================== */

    async function startListener() {

        if (
            typeof stopListener ===
            "function"
        ) {

            return true;
        }


        const firebase =
            await getFirebase();


        const tools =
            await getFirestoreTools();


        console.log(
            "☁️ Starting authenticated branch realtime listener..."
        );


        stopListener =
            tools.onSnapshot(

                tools.collection(
                    firebase.db,
                    COLLECTION_NAME
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
                                documentSnapshot
                                    .data() ||
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


                    const merged =
                        mergeBranchesSafely(
                            localBranches,
                            cloudBranches
                        );


                    saveBranchesLocally(
                        merged,
                        "cloud"
                    );


                    console.log(
                        "✅ Branch realtime update received:",
                        merged.length
                    );
                },

                function (
                    error
                ) {

                    console.error(
                        "❌ Branch realtime listener failed:",
                        error
                    );


                    showCloudError(
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
       DELAYED SYNC
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
                400
            );
    }


    /* ==========================================
       LOCAL CHANGE EVENTS
    ========================================== */

    document.addEventListener(
        "jufelix:data-updated",
        function (event) {

            const detail =
                event &&
                event.detail
                    ? event.detail
                    : {};


            if (
                applyingCloudData
            ) {

                return;
            }


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

                console.log(
                    "📡 Local branch change detected."
                );


                scheduleSync();
            }
        }
    );


    document.addEventListener(
        "jufelix:dataChanged",
        function (event) {

            const detail =
                event &&
                event.detail
                    ? event.detail
                    : {};


            if (
                applyingCloudData
            ) {

                return;
            }


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
       CLOUD ERROR DISPLAY
    ========================================== */

    function showCloudError(
        error
    ) {

        const code =
            error &&
            error.code
                ? String(
                    error.code
                )
                : "unknown";


        const message =
            error &&
            error.message
                ? error.message
                : String(
                    error ||
                    "Unknown Firebase error"
                );


        let box =
            document.getElementById(
                "branchFirebaseError"
            );


        if (!box) {

            box =
                document.createElement(
                    "div"
                );


            box.id =
                "branchFirebaseError";


            box.style.position =
                "fixed";

            box.style.left =
                "12px";

            box.style.right =
                "12px";

            box.style.bottom =
                "12px";

            box.style.zIndex =
                "999999";

            box.style.padding =
                "15px";

            box.style.borderRadius =
                "11px";

            box.style.background =
                "#7f1d1d";

            box.style.color =
                "#ffffff";

            box.style.fontSize =
                "13px";

            box.style.lineHeight =
                "1.5";

            box.style.boxShadow =
                "0 10px 30px rgba(0,0,0,.30)";


            document.body.appendChild(
                box
            );
        }


        box.innerHTML =
            "<strong>BRANCH FIREBASE ERROR</strong><br>" +
            "Code: " +
            escapeHTML(
                code
            ) +
            "<br>" +
            "Message: " +
            escapeHTML(
                message
            );


        window.clearTimeout(
            showCloudError.timer
        );


        showCloudError.timer =
            window.setTimeout(
                function () {

                    if (box) {

                        box.remove();
                    }
                },
                10000
            );
    }


    /* ==========================================
       ESCAPE
    ========================================== */

    function escapeHTML(
        value
    ) {

        return String(
            value === undefined ||
            value === null
                ? ""
                : value
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


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

            const firebase =
                await getFirebase();


            console.log(
                "✅ Branch Firebase authenticated:",
                firebase.auth &&
                firebase.auth.currentUser
                    ? (
                        firebase.auth
                            .currentUser
                            .email ||
                        firebase.auth
                            .currentUser
                            .uid
                    )
                    : "User"
            );


            /*
             * Upload existing local branches.
             */

            await syncLocal();


            /*
             * Then start Firebase → device
             * realtime synchronization.
             */

            await startListener();


            console.log(
                "✅ Jufelix Branches Cloud v801 ready."
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
                "❌ Branch Cloud startup failed:",
                error
            );


            showCloudError(
                error
            );


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

        getLocal:
            readBranches,

        refresh:
            async function () {

                await getFirebase();

                await syncLocal();

                await startListener();

                return true;
            }
    };


    console.log(
        "✅ JufelixBranchesCloud v801 API loaded."
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