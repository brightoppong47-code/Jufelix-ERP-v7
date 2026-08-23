/* =========================================
   PUBLIC WAIT HELPER
========================================= */

window.waitForJufelixFirebase =
    function (
        options
    ) {

        const settings =
            options || {};


        const requireUser =
            settings.requireUser ===
            true;


        const timeout =
            Number(
                settings.timeout ||
                20000
            );


        return new Promise(
            function (
                resolve,
                reject
            ) {

                const startedAt =
                    Date.now();


                function check() {

                    const firebase =
                        window.JufelixFirebase;


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
                        firebase.ready &&
                        firebase.authReady
                    ) {

                        /*
                         * If no authenticated Firebase
                         * user is required, Firebase is
                         * ready immediately.
                         */

                        if (!requireUser) {

                            resolve(
                                firebase
                            );

                            return;
                        }


                        /*
                         * If an authenticated Firebase
                         * user is required, wait for the
                         * restored/current user.
                         *
                         * Do NOT reject immediately.
                         */

                        const currentUser =

                            firebase.user ||

                            firebase.auth
                                .currentUser;


                        if (currentUser) {

                            firebase.user =
                                currentUser;


                            resolve(
                                firebase
                            );

                            return;
                        }
                    }


                    /*
                     * Only fail after the complete
                     * waiting period has expired.
                     */

                    if (
                        Date.now() -
                        startedAt >
                        timeout
                    ) {

                        if (requireUser) {

                            reject(
                                new Error(
                                    "Firebase user is not authenticated."
                                )
                            );

                        } else {

                            reject(
                                new Error(
                                    "Firebase initialization timed out."
                                )
                            );
                        }


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
    };