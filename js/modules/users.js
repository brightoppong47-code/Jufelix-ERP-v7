/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   USERS MANAGEMENT MODULE

   File:
   js/modules/users.js

   Version: 513

   COMPLETE REPLACEMENT

   + Firebase user creation
   + Firebase profile update
   + Safe account deactivation
   + Account reactivation
   + Branch assignment
   + User statistics
   + LocalStorage mirror
   + No password storage
   + Standard ERP roles
   + Protect current signed-in user
   + Protect last active administrator
   + Email locked during editing
   + Active / inactive counters
========================================== */

(function () {

    "use strict";


    /* ==========================================
       STORAGE KEYS
    ========================================== */

    const USERS_KEY =
        "jufelix_v7_users";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    const CURRENT_USER_KEY =
        "jufelix_v7_current_user";

    const DEFAULT_BRANCH_ID =
        "head-office";


    /* ==========================================
       STATE
    ========================================== */

    let editingId =
        null;

    let el =
        {};


    /* ==========================================
       START
    ========================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeUsers
        );

    } else {

        initializeUsers();
    }


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeUsers() {

        cacheElements();

        loadBranches();

        bindEvents();

        cleanupLegacyPasswords();

        renderUsers();


        console.log(
            "✅ Jufelix Users v513 loaded."
        );
    }


    /* ==========================================
       ELEMENTS
    ========================================== */

    function cacheElements() {

        el = {

            form:
                findElement(
                    "userForm",
                    "usersForm"
                ),

            fullName:
                findElement(
                    "fullName",
                    "userFullName"
                ),

            email:
                findElement(
                    "email",
                    "userEmail"
                ),

            phone:
                findElement(
                    "phone",
                    "userPhone"
                ),

            username:
                findElement(
                    "username",
                    "userUsername"
                ),

            password:
                findElement(
                    "password",
                    "userPassword"
                ),

            role:
                findElement(
                    "role",
                    "userRole"
                ),

            branch:
                findElement(
                    "branch",
                    "branchId",
                    "userBranch"
                ),

            status:
                findElement(
                    "status",
                    "userStatus"
                ),

            search:
                findElement(
                    "searchUsers",
                    "userSearch"
                ),

            roleFilter:
                findElement(
                    "roleFilter",
                    "userRoleFilter"
                ),

            branchFilter:
                findElement(
                    "branchFilter",
                    "userBranchFilter"
                ),

            tbody:
                findElement(
                    "usersTableBody",
                    "userTableBody",
                    "usersTable"
                ),

            save:
                findElement(
                    "saveUserButton",
                    "saveUserBtn"
                ),

            reset:
                findElement(
                    "resetUserButton",
                    "resetUserBtn"
                ),

            message:
                findElement(
                    "userMessage",
                    "usersMessage",
                    "formMessage"
                ),

            totalUsers:
                findElement(
                    "totalUsers",
                    "usersTotal",
                    "totalUserCount"
                ),

            activeUsers:
                findElement(
                    "activeUsers",
                    "usersActive",
                    "activeUserCount"
                ),

            inactiveUsers:
                findElement(
                    "inactiveUsers",
                    "usersInactive",
                    "inactiveUserCount"
                )
        };
    }


    function findElement(
        ...ids
    ) {

        for (
            const id of ids
        ) {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                return element;
            }
        }


        return null;
    }


    /* ==========================================
       EVENTS
    ========================================== */

    function bindEvents() {

        if (
            el.form
        ) {

            el.form.addEventListener(
                "submit",
                saveUser
            );
        }


        if (
            el.reset
        ) {

            el.reset.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.preventDefault();

                    resetForm();
                }
            );
        }


        if (
            el.search
        ) {

            el.search.addEventListener(
                "input",
                renderUsers
            );
        }


        if (
            el.roleFilter
        ) {

            el.roleFilter.addEventListener(
                "change",
                renderUsers
            );
        }


        if (
            el.branchFilter
        ) {

            el.branchFilter.addEventListener(
                "change",
                renderUsers
            );
        }


        document.addEventListener(
            "jufelix:data-updated",
            function (
                event
            ) {

                const detail =
                    event.detail ||
                    {};


                if (
                    detail.key ===
                    USERS_KEY
                ) {

                    mergeCloudUserEvent(
                        detail
                    );

                    renderUsers();
                }


                if (
                    detail.key ===
                    BRANCHES_KEY
                ) {

                    loadBranches();

                    renderUsers();
                }
            }
        );


        document.addEventListener(
            "jufelix:user-cloud-saved",
            function (
                event
            ) {

                mergeCloudUserEvent(
                    event.detail ||
                    {}
                );

                renderUsers();
            }
        );


        window.addEventListener(
            "storage",
            function (
                event
            ) {

                if (
                    event.key ===
                    USERS_KEY
                ) {

                    renderUsers();
                }


                if (
                    event.key ===
                    BRANCHES_KEY
                ) {

                    loadBranches();

                    renderUsers();
                }
            }
        );
    }


    /* ==========================================
       SAVE USER
    ========================================== */

    async function saveUser(
        event
    ) {

        event.preventDefault();


        const users =
            readArray(
                USERS_KEY
            );


        const existingUser =
            editingId

                ? users.find(
                    function (
                        user
                    ) {

                        return (
                            String(
                                user.id
                            ) ===
                            String(
                                editingId
                            )
                        );
                    }
                )

                : null;


        const branchId =
            getValue(
                el.branch
            ) ||
            DEFAULT_BRANCH_ID;


        const branch =
            findBranchById(
                branchId
            );


        const fullName =
            getValue(
                el.fullName
            );


        const email =
            getValue(
                el.email
            )
                .toLowerCase();


        let username =
            getValue(
                el.username
            )
                .toLowerCase();


        const password =
            el.password
                ? String(
                    el.password.value ||
                    ""
                )
                : "";


        const role =
            normalizeRole(
                getValue(
                    el.role
                )
            );


        const status =
            normalizeStatus(
                getValue(
                    el.status
                )
            );


        if (
            !fullName
        ) {

            showMessage(
                "Enter the user full name.",
                "error"
            );

            return;
        }


        if (
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    email
                )
        ) {

            showMessage(
                "Enter a valid email address.",
                "error"
            );

            return;
        }


        if (
            !username
        ) {

            username =
                email
                    .split("@")[0];
        }


        if (
            !role
        ) {

            showMessage(
                "Select a user role.",
                "error"
            );

            return;
        }


        if (
            !editingId &&
            password.length <
                6
        ) {

            showMessage(
                "Password must contain at least 6 characters.",
                "error"
            );

            return;
        }


        /*
         * Existing Firebase login email cannot
         * be changed from this screen.
         */

        if (
            existingUser
        ) {

            const originalEmail =
                String(
                    existingUser.loginEmail ||
                    existingUser.email ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                originalEmail &&
                email !==
                originalEmail
            ) {

                showMessage(
                    "The login email cannot be changed while editing a user.",
                    "error"
                );

                return;
            }
        }


        const duplicateEmail =
            users.some(
                function (
                    user
                ) {

                    return (
                        String(
                            user.email ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                            email &&

                        String(
                            user.id
                        ) !==
                        String(
                            editingId ||
                            ""
                        )
                    );
                }
            );


        if (
            duplicateEmail
        ) {

            showMessage(
                "A user with this email already exists.",
                "error"
            );

            return;
        }


        const duplicateUsername =
            users.some(
                function (
                    user
                ) {

                    return (
                        String(
                            user.username ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                            username &&

                        String(
                            user.id
                        ) !==
                        String(
                            editingId ||
                            ""
                        )
                    );
                }
            );


        if (
            duplicateUsername
        ) {

            showMessage(
                "This username is already in use.",
                "error"
            );

            return;
        }


        /*
         * Protect current signed-in account.
         */

        if (
            existingUser &&
            isCurrentUser(
                existingUser
            )
        ) {

            if (
                status ===
                "inactive"
            ) {

                showMessage(
                    "You cannot deactivate the account you are currently using.",
                    "error"
                );

                return;
            }


            if (
                normalizeRole(
                    existingUser.role
                ) ===
                    "admin" &&
                role !==
                    "admin"
            ) {

                if (
                    countActiveAdmins(
                        users
                    ) <=
                    1
                ) {

                    showMessage(
                        "You cannot remove administrator access from the last active administrator.",
                        "error"
                    );

                    return;
                }
            }
        }


        /*
         * Protect last administrator.
         */

        if (
            existingUser &&
            normalizeRole(
                existingUser.role
            ) ===
                "admin" &&
            normalizeStatus(
                existingUser.status
            ) ===
                "active"
        ) {

            const removingAdminAccess =
                role !==
                "admin" ||
                status !==
                "active";


            if (
                removingAdminAccess &&
                countActiveAdmins(
                    users
                ) <=
                1
            ) {

                showMessage(
                    "At least one active administrator must remain in the system.",
                    "error"
                );

                return;
            }
        }


        const data = {

            fullName:
                fullName,

            name:
                fullName,

            email:
                email,

            loginEmail:
                existingUser
                    ? (
                        existingUser.loginEmail ||
                        existingUser.email ||
                        email
                    )
                    : email,

            phone:
                getValue(
                    el.phone
                ),

            username:
                username,

            role:
                role,

            branchId:
                branchId,

            branchName:
                branch
                    ? getBranchName(
                        branch
                    )
                    : "Head Office",

            status:
                status
        };


        /*
         * Password is ONLY supplied during
         * Firebase account creation.
         */

        if (
            !editingId
        ) {

            data.password =
                password;
        }


        setSaving(
            true
        );


        try {

            let savedUser;


            if (
                !editingId
            ) {

                const cloud =
                    await waitForUsersCloud();


                savedUser =
                    await cloud.createUser(
                        data
                    );


            } else {

                const cloud =
                    await waitForUsersCloud();


                savedUser =
                    await cloud.updateUser(
                        existingUser.uid ||
                        existingUser.id,
                        data
                    );
            }


            const updatedUsers =
                readArray(
                    USERS_KEY
                );


            const record =
                sanitizeUserRecord({

                    ...existingUser,

                    ...data,

                    ...savedUser,

                    id:
                        String(
                            savedUser.uid ||
                            savedUser.id ||
                            editingId
                        ),

                    uid:
                        String(
                            savedUser.uid ||
                            savedUser.id ||
                            editingId
                        ),

                    updatedAt:
                        new Date()
                            .toISOString()
                });


            const index =
                updatedUsers.findIndex(
                    function (
                        user
                    ) {

                        return (
                            String(
                                user.id
                            ) ===
                            String(
                                record.id
                            )
                        );
                    }
                );


            if (
                index >=
                0
            ) {

                updatedUsers[
                    index
                ] =
                    record;

            } else {

                record.createdAt =
                    record.createdAt ||
                    new Date()
                        .toISOString();


                updatedUsers.push(
                    record
                );
            }


            writeUsers(
                updatedUsers
            );


            const wasEditing =
                Boolean(
                    editingId
                );


            resetForm();

            renderUsers();


            showMessage(
                wasEditing
                    ? "User updated successfully."
                    : "User created successfully.",
                "success"
            );


        } catch (
            error
        ) {

            console.error(
                "User save failed:",
                error
            );


            showMessage(
                friendlyError(
                    error
                ),
                "error"
            );


        } finally {

            setSaving(
                false
            );
        }
    }


    /* ==========================================
       WAIT FOR USERS CLOUD
    ========================================== */

    function waitForUsersCloud(
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
                        window.JufelixUsersCloud &&
                        typeof window
                            .JufelixUsersCloud
                            .createUser ===
                            "function"
                    ) {

                        resolve(
                            window.JufelixUsersCloud
                        );

                        return;
                    }


                    if (
                        Date.now() -
                        started >=
                        timeout
                    ) {

                        reject(
                            new Error(
                                "Users Cloud did not become ready."
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
       STATISTICS
    ========================================== */

    function updateUserStatistics() {

        const users =
            readArray(
                USERS_KEY
            );


        const totalUsers =
            users.length;


        const activeUsers =
            users.filter(
                function (
                    user
                ) {

                    return (
                        normalizeStatus(
                            user.status
                        ) ===
                        "active"
                    );
                }
            ).length;


        const inactiveUsers =
            users.filter(
                function (
                    user
                ) {

                    return (
                        normalizeStatus(
                            user.status
                        ) ===
                        "inactive"
                    );
                }
            ).length;


        setText(
            el.totalUsers,
            totalUsers
        );


        setText(
            el.activeUsers,
            activeUsers
        );


        setText(
            el.inactiveUsers,
            inactiveUsers
        );
    }


    /* ==========================================
       RENDER USERS
    ========================================== */

    function renderUsers() {

        updateUserStatistics();


        if (
            !el.tbody
        ) {

            return;
        }


        let users =
            readArray(
                USERS_KEY
            );


        const search =
            getValue(
                el.search
            )
                .toLowerCase();


        const roleFilter =
            normalizeRoleFilter(
                getValue(
                    el.roleFilter
                )
            );


        const branchFilter =
            getValue(
                el.branchFilter
            );


        users =
            users
                .filter(
                    function (
                        user
                    ) {

                        const searchable =
                            [
                                user.fullName,
                                user.name,
                                user.email,
                                user.phone,
                                user.username,
                                roleName(
                                    user.role
                                ),
                                user.branchName,
                                user.status
                            ]
                                .join(
                                    " "
                                )
                                .toLowerCase();


                        const matchesSearch =
                            !search ||
                            searchable.includes(
                                search
                            );


                        const matchesRole =
                            !roleFilter ||
                            roleFilter ===
                                "all" ||
                            normalizeRole(
                                user.role
                            ) ===
                                roleFilter;


                        const matchesBranch =
                            !branchFilter ||
                            branchFilter ===
                                "all" ||
                            String(
                                user.branchId ||
                                DEFAULT_BRANCH_ID
                            ) ===
                                String(
                                    branchFilter
                                );


                        return (
                            matchesSearch &&
                            matchesRole &&
                            matchesBranch
                        );
                    }
                )
                .sort(
                    function (
                        a,
                        b
                    ) {

                        return String(
                            a.fullName ||
                            a.name ||
                            ""
                        ).localeCompare(
                            String(
                                b.fullName ||
                                b.name ||
                                ""
                            )
                        );
                    }
                );


        if (
            users.length ===
            0
        ) {

            el.tbody.innerHTML = `
                <tr>

                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:28px;
                        "
                    >
                        No users found.
                    </td>

                </tr>
            `;


            return;
        }


        el.tbody.innerHTML =
            users
                .map(
                    function (
                        user
                    ) {

                        const active =
                            normalizeStatus(
                                user.status
                            ) ===
                            "active";


                        const current =
                            isCurrentUser(
                                user
                            );


                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        user.fullName ||
                                        user.name ||
                                        "—"
                                    )}

                                    ${
                                        current
                                            ? '<div style="font-size:11px;color:#0b5ed7;font-weight:700;">Current User</div>'
                                            : ""
                                    }
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.email ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.phone ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        roleName(
                                            user.role
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        user.branchName ||
                                        "Head Office"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        active
                                            ? "Active"
                                            : "Inactive"
                                    )}
                                </td>

                                <td>

                                    <button
                                        type="button"
                                        data-edit="${escapeHTML(
                                            user.id
                                        )}"
                                    >
                                        Edit
                                    </button>

                                </td>

                                <td>

                                    ${
                                        active

                                            ? `
                                                <button
                                                    type="button"
                                                    data-deactivate="${escapeHTML(
                                                        user.id
                                                    )}"
                                                    ${current ? "disabled" : ""}
                                                >
                                                    Deactivate
                                                </button>
                                            `

                                            : `
                                                <button
                                                    type="button"
                                                    data-activate="${escapeHTML(
                                                        user.id
                                                    )}"
                                                >
                                                    Activate
                                                </button>
                                            `
                                    }

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");


        connectTableButtons();
    }


    /* ==========================================
       TABLE EVENTS
    ========================================== */

    function connectTableButtons() {

        el.tbody
            .querySelectorAll(
                "[data-edit]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.addEventListener(
                        "click",
                        function () {

                            editUser(
                                button.dataset
                                    .edit
                            );
                        }
                    );
                }
            );


        el.tbody
            .querySelectorAll(
                "[data-deactivate]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.addEventListener(
                        "click",
                        function () {

                            deactivateUser(
                                button.dataset
                                    .deactivate
                            );
                        }
                    );
                }
            );


        el.tbody
            .querySelectorAll(
                "[data-activate]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.addEventListener(
                        "click",
                        function () {

                            activateUser(
                                button.dataset
                                    .activate
                            );
                        }
                    );
                }
            );
    }


    /* ==========================================
       EDIT USER
    ========================================== */

    function editUser(
        id
    ) {

        const user =
            readArray(
                USERS_KEY
            )
                .find(
                    function (
                        item
                    ) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                id
                            )
                        );
                    }
                );


        if (
            !user
        ) {

            showMessage(
                "User not found.",
                "error"
            );

            return;
        }


        editingId =
            user.id;


        setValue(
            el.fullName,
            user.fullName ||
            user.name
        );


        setValue(
            el.email,
            user.loginEmail ||
            user.email
        );


        setValue(
            el.phone,
            user.phone
        );


        setValue(
            el.username,
            user.username
        );


        setValue(
            el.role,
            normalizeRole(
                user.role
            )
        );


        setValue(
            el.branch,
            user.branchId ||
            DEFAULT_BRANCH_ID
        );


        setValue(
            el.status,
            normalizeStatus(
                user.status
            )
        );


        /*
         * Firebase Authentication email is
         * intentionally locked during edit.
         */

        if (
            el.email
        ) {

            el.email.readOnly =
                true;

            el.email.title =
                "Login email cannot be changed from User Management.";
        }


        /*
         * Password changes are not handled
         * through this browser profile editor.
         */

        if (
            el.password
        ) {

            el.password.value =
                "";

            el.password.required =
                false;

            el.password.disabled =
                true;

            el.password.placeholder =
                "Password unchanged";
        }


        if (
            el.save
        ) {

            el.save.textContent =
                "💾 Update User";
        }


        showMessage(
            "Editing user. Login email and password are protected.",
            "success"
        );
    }


    /* ==========================================
       DEACTIVATE USER
    ========================================== */

    async function deactivateUser(
        id
    ) {

        let users =
            readArray(
                USERS_KEY
            );


        const user =
            users.find(
                function (
                    item
                ) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            id
                        )
                    );
                }
            );


        if (
            !user
        ) {

            showMessage(
                "User not found.",
                "error"
            );

            return;
        }


        if (
            isCurrentUser(
                user
            )
        ) {

            showMessage(
                "You cannot deactivate the account you are currently using.",
                "error"
            );

            return;
        }


        if (
            normalizeRole(
                user.role
            ) ===
                "admin" &&
            normalizeStatus(
                user.status
            ) ===
                "active" &&
            countActiveAdmins(
                users
            ) <=
                1
        ) {

            showMessage(
                "The last active administrator cannot be deactivated.",
                "error"
            );

            return;
        }


        const confirmed =
            window.confirm(
                "Deactivate " +
                (
                    user.fullName ||
                    user.email ||
                    "this user"
                ) +
                "?\n\nThey will no longer be allowed to enter the ERP."
            );


        if (
            !confirmed
        ) {

            return;
        }


        try {

            const cloud =
                await waitForUsersCloud();


            const updated =
                await cloud.deactivateUser(
                    user.uid ||
                    user.id
                );


            users =
                readArray(
                    USERS_KEY
                );


            const index =
                users.findIndex(
                    function (
                        item
                    ) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                id
                            )
                        );
                    }
                );


            if (
                index >=
                0
            ) {

                users[
                    index
                ] =
                    sanitizeUserRecord({

                        ...users[
                            index
                        ],

                        ...updated,

                        status:
                            "inactive"
                    });
            }


            writeUsers(
                users
            );


            renderUsers();


            showMessage(
                "User deactivated successfully.",
                "success"
            );


        } catch (
            error
        ) {

            console.error(
                "User deactivation failed:",
                error
            );


            showMessage(
                friendlyError(
                    error
                ),
                "error"
            );
        }
    }


    /* ==========================================
       ACTIVATE USER
    ========================================== */

    async function activateUser(
        id
    ) {

        let users =
            readArray(
                USERS_KEY
            );


        const user =
            users.find(
                function (
                    item
                ) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            id
                        )
                    );
                }
            );


        if (
            !user
        ) {

            showMessage(
                "User not found.",
                "error"
            );

            return;
        }


        const confirmed =
            window.confirm(
                "Reactivate " +
                (
                    user.fullName ||
                    user.email ||
                    "this user"
                ) +
                "?"
            );


        if (
            !confirmed
        ) {

            return;
        }


        try {

            const cloud =
                await waitForUsersCloud();


            const updated =
                await cloud.activateUser(
                    user.uid ||
                    user.id
                );


            users =
                readArray(
                    USERS_KEY
                );


            const index =
                users.findIndex(
                    function (
                        item
                    ) {

                        return (
                            String(
                                item.id
                            ) ===
                            String(
                                id
                            )
                        );
                    }
                );


            if (
                index >=
                0
            ) {

                users[
                    index
                ] =
                    sanitizeUserRecord({

                        ...users[
                            index
                        ],

                        ...updated,

                        status:
                            "active"
                    });
            }


            writeUsers(
                users
            );


            renderUsers();


            showMessage(
                "User reactivated successfully.",
                "success"
            );


        } catch (
            error
        ) {

            console.error(
                "User activation failed:",
                error
            );


            showMessage(
                friendlyError(
                    error
                ),
                "error"
            );
        }
    }


    /* ==========================================
       LOAD BRANCHES
    ========================================== */

    function loadBranches() {

        let branches =
            readArray(
                BRANCHES_KEY
            );


        const headOfficeExists =
            branches.some(
                function (
                    branch
                ) {

                    return (
                        String(
                            branch.id ||
                            branch.branchId ||
                            ""
                        ) ===
                        DEFAULT_BRANCH_ID
                    );
                }
            );


        if (
            !headOfficeExists
        ) {

            branches.unshift({

                id:
                    DEFAULT_BRANCH_ID,

                branchId:
                    DEFAULT_BRANCH_ID,

                name:
                    "Head Office",

                branchName:
                    "Head Office",

                status:
                    "active",

                isHeadOffice:
                    true
            });
        }


        const activeBranches =
            branches
                .filter(
                    function (
                        branch
                    ) {

                        return (
                            normalizeStatus(
                                branch.status
                            ) ===
                            "active"
                        );
                    }
                )
                .sort(
                    function (
                        a,
                        b
                    ) {

                        if (
                            String(
                                a.id
                            ) ===
                            DEFAULT_BRANCH_ID
                        ) {

                            return -1;
                        }


                        if (
                            String(
                                b.id
                            ) ===
                            DEFAULT_BRANCH_ID
                        ) {

                            return 1;
                        }


                        return getBranchName(
                            a
                        ).localeCompare(
                            getBranchName(
                                b
                            )
                        );
                    }
                );


        if (
            el.branch
        ) {

            const previous =
                el.branch.value;


            el.branch.innerHTML =
                '<option value="">Select Branch</option>' +
                activeBranches
                    .map(
                        function (
                            branch
                        ) {

                            return `
                                <option
                                    value="${escapeHTML(
                                        branch.id
                                    )}"
                                >
                                    ${escapeHTML(
                                        getBranchName(
                                            branch
                                        )
                                    )}
                                </option>
                            `;
                        }
                    )
                    .join("");


            if (
                previous &&
                activeBranches.some(
                    function (
                        branch
                    ) {

                        return (
                            String(
                                branch.id
                            ) ===
                            String(
                                previous
                            )
                        );
                    }
                )
            ) {

                el.branch.value =
                    previous;
            }
        }


        if (
            el.branchFilter
        ) {

            const previous =
                el.branchFilter.value;


            el.branchFilter.innerHTML =
                '<option value="">All Branches</option>' +
                activeBranches
                    .map(
                        function (
                            branch
                        ) {

                            return `
                                <option
                                    value="${escapeHTML(
                                        branch.id
                                    )}"
                                >
                                    ${escapeHTML(
                                        getBranchName(
                                            branch
                                        )
                                    )}
                                </option>
                            `;
                        }
                    )
                    .join("");


            if (
                previous &&
                activeBranches.some(
                    function (
                        branch
                    ) {

                        return (
                            String(
                                branch.id
                            ) ===
                            String(
                                previous
                            )
                        );
                    }
                )
            ) {

                el.branchFilter.value =
                    previous;
            }
        }
    }


    function findBranchById(
        branchId
    ) {

        if (
            String(
                branchId
            ) ===
            DEFAULT_BRANCH_ID
        ) {

            return {

                id:
                    DEFAULT_BRANCH_ID,

                branchName:
                    "Head Office",

                name:
                    "Head Office"
            };
        }


        return (
            readArray(
                BRANCHES_KEY
            )
                .find(
                    function (
                        branch
                    ) {

                        return (
                            String(
                                branch.id ||
                                branch.branchId
                            ) ===
                            String(
                                branchId
                            )
                        );
                    }
                ) ||
            null
        );
    }


    function getBranchName(
        branch
    ) {

        if (
            !branch
        ) {

            return "Head Office";
        }


        return (
            branch.branchName ||
            branch.name ||
            branch.code ||
            "Branch"
        );
    }


    /* ==========================================
       RESET FORM
    ========================================== */

    function resetForm() {

        editingId =
            null;


        if (
            el.form
        ) {

            el.form.reset();
        }


        if (
            el.email
        ) {

            el.email.readOnly =
                false;

            el.email.title =
                "";
        }


        if (
            el.password
        ) {

            el.password.disabled =
                false;

            el.password.required =
                true;

            el.password.value =
                "";

            el.password.placeholder =
                "Enter password";
        }


        if (
            el.status
        ) {

            el.status.value =
                "active";
        }


        if (
            el.save
        ) {

            el.save.textContent =
                "💾 Save User";
        }
    }


    /* ==========================================
       CURRENT USER
    ========================================== */

    function getCurrentUser() {

        return (

            readObject(
                CURRENT_USER_KEY
            ) ||

            readObject(
                "currentUser"
            ) ||

            null
        );
    }


    function isCurrentUser(
        user
    ) {

        const currentUser =
            getCurrentUser();


        if (
            !currentUser ||
            !user
        ) {

            return false;
        }


        const currentUid =
            String(
                currentUser.uid ||
                currentUser.id ||
                ""
            );


        const userUid =
            String(
                user.uid ||
                user.id ||
                ""
            );


        if (
            currentUid &&
            userUid &&
            currentUid ===
                userUid
        ) {

            return true;
        }


        const currentEmail =
            String(
                currentUser.email ||
                ""
            )
                .trim()
                .toLowerCase();


        const userEmail =
            String(
                user.email ||
                ""
            )
                .trim()
                .toLowerCase();


        return (
            currentEmail &&
            userEmail &&
            currentEmail ===
                userEmail
        );
    }


    /* ==========================================
       ADMIN PROTECTION
    ========================================== */

    function countActiveAdmins(
        users
    ) {

        return users.filter(
            function (
                user
            ) {

                return (

                    normalizeRole(
                        user.role
                    ) ===
                        "admin" &&

                    normalizeStatus(
                        user.status
                    ) ===
                        "active"
                );
            }
        ).length;
    }


    /* ==========================================
       CLOUD USER MERGE
    ========================================== */

    function mergeCloudUserEvent(
        detail
    ) {

        const cloudUser =
            detail.user;


        if (
            !cloudUser ||
            !(
                cloudUser.id ||
                cloudUser.uid
            )
        ) {

            return;
        }


        let users =
            readArray(
                USERS_KEY
            );


        const id =
            String(
                cloudUser.uid ||
                cloudUser.id
            );


        const index =
            users.findIndex(
                function (
                    user
                ) {

                    return (
                        String(
                            user.uid ||
                            user.id
                        ) ===
                        id
                    );
                }
            );


        const record =
            sanitizeUserRecord({

                ...(
                    index >=
                    0
                        ? users[
                            index
                        ]
                        : {}
                ),

                ...cloudUser,

                id:
                    id,

                uid:
                    id
            });


        if (
            index >=
            0
        ) {

            users[
                index
            ] =
                record;

        } else {

            users.push(
                record
            );
        }


        saveUsersSilently(
            users
        );
    }


    /* ==========================================
       LEGACY PASSWORD CLEANUP
    ========================================== */

    function cleanupLegacyPasswords() {

        const users =
            readArray(
                USERS_KEY
            );


        let changed =
            false;


        const cleaned =
            users.map(
                function (
                    user
                ) {

                    if (
                        Object.prototype
                            .hasOwnProperty.call(
                                user,
                                "password"
                            )
                    ) {

                        changed =
                            true;
                    }


                    return sanitizeUserRecord(
                        user
                    );
                }
            );


        if (
            changed
        ) {

            saveUsersSilently(
                cleaned
            );


            console.log(
                "✅ Legacy locally stored user passwords removed."
            );
        }
    }


    function sanitizeUserRecord(
        user
    ) {

        const record = {

            ...(
                user ||
                {}
            )
        };


        delete record.password;


        record.role =
            normalizeRole(
                record.role
            );


        record.status =
            normalizeStatus(
                record.status
            );


        if (
            record.uid &&
            !record.id
        ) {

            record.id =
                String(
                    record.uid
                );
        }


        if (
            record.id &&
            !record.uid
        ) {

            record.uid =
                String(
                    record.id
                );
        }


        if (
            record.email
        ) {

            record.email =
                String(
                    record.email
                )
                    .trim()
                    .toLowerCase();
        }


        if (
            !record.loginEmail &&
            record.email
        ) {

            record.loginEmail =
                record.email;
        }


        return record;
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function readArray(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
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
                "Unable to read:",
                key,
                error
            );


            return [];
        }
    }


    function readObject(
        key
    ) {

        try {

            const stored =
                localStorage.getItem(
                    key
                );


            if (
                !stored
            ) {

                return null;
            }


            const parsed =
                JSON.parse(
                    stored
                );


            return (
                parsed &&
                typeof parsed ===
                    "object" &&
                !Array.isArray(
                    parsed
                )
            )
                ? parsed
                : null;


        } catch (
            error
        ) {

            return null;
        }
    }


    function writeUsers(
        users
    ) {

        const cleanUsers =
            users.map(
                sanitizeUserRecord
            );


        try {

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(
                    cleanUsers
                )
            );


            document.dispatchEvent(

                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {

                            key:
                                USERS_KEY,

                            value:
                                cleanUsers,

                            source:
                                "users-module"
                        }
                    }
                )

            );


            return true;


        } catch (
            error
        ) {

            console.error(
                "Unable to save users:",
                error
            );


            return false;
        }
    }


    function saveUsersSilently(
        users
    ) {

        try {

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(
                    users.map(
                        sanitizeUserRecord
                    )
                )
            );


            return true;


        } catch (
            error
        ) {

            console.error(
                "Unable to save users:",
                error
            );


            return false;
        }
    }


    /* ==========================================
       ROLE
    ========================================== */

    function normalizeRole(
        value
    ) {

        const role =
            String(
                value ||
                ""
            )
                .trim()
                .toLowerCase()
                .replace(
                    /_/g,
                    "-"
                )
                .replace(
                    /\s+/g,
                    "-"
                );


        const aliases = {

            admin:
                "admin",

            administrator:
                "admin",

            "system-administrator":
                "admin",


            manager:
                "manager",

            "branch-manager":
                "manager",


            sales:
                "sales-officer",

            salesperson:
                "sales-officer",

            "sales-person":
                "sales-officer",

            "sales-personnel":
                "sales-officer",

            "sales-officer":
                "sales-officer",


            cashier:
                "cashier",


            stockkeeper:
                "store-keeper",

            "stock-keeper":
                "store-keeper",

            storekeeper:
                "store-keeper",

            "store-keeper":
                "store-keeper",


            accountant:
                "accountant",

            accounts:
                "accountant"
        };


        return (
            aliases[
                role
            ] ||
            role
        );
    }


    function normalizeRoleFilter(
        value
    ) {

        const raw =
            String(
                value ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !raw ||
            raw ===
            "all"
        ) {

            return raw;
        }


        return normalizeRole(
            raw
        );
    }


    function roleName(
        value
    ) {

        const role =
            normalizeRole(
                value
            );


        const names = {

            admin:
                "Administrator",

            manager:
                "Manager",

            "sales-officer":
                "Sales Officer",

            cashier:
                "Cashier",

            "store-keeper":
                "Store Keeper",

            accountant:
                "Accountant"
        };


        return (
            names[
                role
            ] ||
            role ||
            "—"
        );
    }


    /* ==========================================
       STATUS
    ========================================== */

    function normalizeStatus(
        value
    ) {

        return String(
            value ||
            "active"
        )
            .trim()
            .toLowerCase() ===
            "inactive"

            ? "inactive"

            : "active";
    }


    /* ==========================================
       HELPERS
    ========================================== */

    function getValue(
        element
    ) {

        return element
            ? String(
                element.value ||
                ""
            ).trim()
            : "";
    }


    function setValue(
        element,
        value
    ) {

        if (
            element
        ) {

            element.value =
                value ===
                    undefined ||
                value ===
                    null
                    ? ""
                    : value;
        }
    }


    function setText(
        element,
        value
    ) {

        if (
            element
        ) {

            element.textContent =
                String(
                    value
                );
        }
    }


    function setSaving(
        state
    ) {

        if (
            !el.save
        ) {

            return;
        }


        el.save.disabled =
            state;


        el.save.textContent =
            state
                ? "Saving..."
                : (
                    editingId
                        ? "💾 Update User"
                        : "💾 Save User"
                );
    }


    function friendlyError(
        error
    ) {

        if (
            window.JufelixUsersCloud &&
            typeof window
                .JufelixUsersCloud
                .friendlyError ===
                "function"
        ) {

            return window
                .JufelixUsersCloud
                .friendlyError(
                    error
                );
        }


        const code =
            String(
                error &&
                error.code ||
                ""
            );


        if (
            code.includes(
                "email-already-in-use"
            )
        ) {

            return "This email is already registered in Firebase Authentication.";
        }


        if (
            code.includes(
                "weak-password"
            )
        ) {

            return "Password must contain at least 6 characters.";
        }


        if (
            code.includes(
                "permission-denied"
            )
        ) {

            return "Firestore denied this operation. Check the signed-in administrator and Firestore rules.";
        }


        return (
            error &&
            error.message
                ? error.message
                : "The user operation could not be completed."
        );
    }


    function showMessage(
        text,
        type
    ) {

        if (
            el.message
        ) {

            el.message.textContent =
                text;

            el.message.className =
                "user-message " +
                type;

            el.message.style.display =
                "block";


            window.clearTimeout(
                showMessage.timer
            );


            showMessage.timer =
                window.setTimeout(
                    function () {

                        if (
                            el.message
                        ) {

                            el.message.style.display =
                                "none";
                        }
                    },
                    4500
                );


        } else {

            alert(
                text
            );
        }
    }


    function escapeHTML(
        value
    ) {

        return String(
            value ===
                undefined ||
            value ===
                null
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
       PUBLIC API
    ========================================== */

    window.JufelixUsers = {

        refresh:
            renderUsers,

        editUser:
            editUser,

        deactivateUser:
            deactivateUser,

        activateUser:
            activateUser,

        resetForm:
            resetForm,

        updateStats:
            updateUserStatistics,

        countActiveAdmins:
            function () {

                return countActiveAdmins(
                    readArray(
                        USERS_KEY
                    )
                );
            }
    };


})();