/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   USERS MANAGEMENT MODULE

   File:
   js/modules/users.js

   Version: 512

   + Firebase user creation
   + Firebase profile update
   + Firebase profile deletion
   + Branch assignment
   + User statistics
   + LocalStorage mirror
   + Active / inactive user counters
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

        ensureAdmin();

        loadBranches();

        bindEvents();

        renderUsers();

        console.log(
            "✅ Jufelix Users v512 loaded."
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


            if (element) {

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
            function () {

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


        const branchId =
            getValue(
                el.branch
            ) ||
            "head-office";


        const branch =
            readArray(
                BRANCHES_KEY
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
                                branchId
                            )
                        );
                    }
                );


        const data = {

            fullName:
                getValue(
                    el.fullName
                ),

            name:
                getValue(
                    el.fullName
                ),

            email:
                getValue(
                    el.email
                )
                    .toLowerCase(),

            phone:
                getValue(
                    el.phone
                ),

            username:
                getValue(
                    el.username
                )
                    .toLowerCase(),

            password:
                el.password
                    ? el.password.value
                    : "",

            role:
                normalizeRole(
                    getValue(
                        el.role
                    )
                ),

            branchId:
                branchId,

            branchName:
                branch
                    ? (
                        branch.branchName ||
                        branch.name ||
                        "Branch"
                    )
                    : "Head Office",

            status:
                getValue(
                    el.status
                ) ||
                "active"
        };


        /* ======================================
           VALIDATION
        ====================================== */

        if (
            !data.fullName
        ) {

            showMessage(
                "Enter the user full name.",
                "error"
            );

            return;
        }


        if (
            !data.email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    data.email
                )
        ) {

            showMessage(
                "Enter a valid email address.",
                "error"
            );

            return;
        }


        if (
            !data.username
        ) {

            data.username =
                data.email
                    .split("@")[0];
        }


        if (
            !data.role
        ) {

            showMessage(
                "Select a user role.",
                "error"
            );

            return;
        }


        if (
            !editingId &&
            data.password.length <
                6
        ) {

            showMessage(
                "Password must contain at least 6 characters.",
                "error"
            );

            return;
        }


        let users =
            readArray(
                USERS_KEY
            );


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
                            .toLowerCase() ===
                            data.email &&

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
                            .toLowerCase() ===
                            data.username &&

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


        setSaving(
            true
        );


        try {

            const wasEditing =
                Boolean(
                    editingId
                );


            if (
                !wasEditing
            ) {

                if (
                    !window.JufelixUsersCloud ||
                    typeof window
                        .JufelixUsersCloud
                        .createUser !==
                        "function"
                ) {

                    throw new Error(
                        "Users Cloud is not ready."
                    );
                }


                const cloudUser =
                    await window
                        .JufelixUsersCloud
                        .createUser(
                            data
                        );


                data.id =
                    String(
                        cloudUser.uid ||
                        cloudUser.id
                    );


                data.uid =
                    data.id;

            } else {

                const existing =
                    users.find(
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
                    );


                data.id =
                    String(
                        editingId
                    );


                data.uid =
                    existing
                        ? (
                            existing.uid ||
                            existing.id
                        )
                        : editingId;


                if (
                    window.JufelixUsersCloud &&
                    typeof window
                        .JufelixUsersCloud
                        .updateUser ===
                        "function"
                ) {

                    await window
                        .JufelixUsersCloud
                        .updateUser(
                            data.uid,
                            data
                        );
                }
            }


            users =
                readArray(
                    USERS_KEY
                );


            const index =
                users.findIndex(
                    function (
                        user
                    ) {

                        return (
                            String(
                                user.id
                            ) ===
                            String(
                                data.id
                            )
                        );
                    }
                );


            const now =
                new Date()
                    .toISOString();


            const record = {

                ...(
                    index >=
                    0
                        ? users[
                            index
                        ]
                        : {}
                ),

                ...data,

                id:
                    String(
                        data.id
                    ),

                uid:
                    String(
                        data.uid ||
                        data.id
                    ),

                updatedAt:
                    now
            };


            if (
                index >=
                0
            ) {

                if (
                    !data.password
                ) {

                    record.password =
                        users[
                            index
                        ].password ||
                        "";
                }


                users[
                    index
                ] =
                    record;

            } else {

                record.createdAt =
                    now;


                users.push(
                    record
                );
            }


            writeUsers(
                users
            );


            resetForm();

            renderUsers();


            showMessage(

                wasEditing
                    ? "User updated successfully."
                    : "User created successfully.",

                "success"
            );


        } catch (error) {

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
       USER STATISTICS
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
                        String(
                            user.status ||
                            "active"
                        )
                            .trim()
                            .toLowerCase() ===
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
                        String(
                            user.status ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        "inactive"
                    );
                }
            ).length;


        if (
            el.totalUsers
        ) {

            el.totalUsers.textContent =
                String(
                    totalUsers
                );
        }


        if (
            el.activeUsers
        ) {

            el.activeUsers.textContent =
                String(
                    activeUsers
                );
        }


        if (
            el.inactiveUsers
        ) {

            el.inactiveUsers.textContent =
                String(
                    inactiveUsers
                );
        }


        console.log(
            "Users statistics:",
            {
                total:
                    totalUsers,

                active:
                    activeUsers,

                inactive:
                    inactiveUsers
            }
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
            normalizeRole(
                getValue(
                    el.roleFilter
                )
            );


        const branchFilter =
            getValue(
                el.branchFilter
            );


        users =
            users.filter(
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
                            user.role,
                            user.branchName
                        ]
                            .join(" ")
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
                            "head-office"
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

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        user.fullName ||
                                        user.name ||
                                        "—"
                                    )}
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
                                        user.status ||
                                        "active"
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

                                    <button
                                        type="button"
                                        data-delete="${escapeHTML(
                                            user.id
                                        )}"
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");


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
                "[data-delete]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.addEventListener(
                        "click",
                        function () {

                            deleteUser(
                                button.dataset
                                    .delete
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


        if (!user) {

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
            user.branchId
        );


        setValue(
            el.status,
            user.status ||
            "active"
        );


        if (
            el.password
        ) {

            el.password.value =
                "";

            el.password.required =
                false;

            el.password.placeholder =
                "Leave blank to keep current password";
        }


        if (
            el.save
        ) {

            el.save.textContent =
                "💾 Update User";
        }
    }


    /* ==========================================
       DELETE USER
    ========================================== */

    async function deleteUser(
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


        if (!user) {

            return;
        }


        if (
            String(
                user.username ||
                ""
            )
                .toLowerCase() ===
            "admin"
        ) {

            showMessage(
                "The default administrator cannot be deleted.",
                "error"
            );

            return;
        }


        const confirmed =
            confirm(
                "Delete " +
                (
                    user.fullName ||
                    user.username ||
                    "this user"
                ) +
                "?"
            );


        if (!confirmed) {

            return;
        }


        try {

            if (
                window.JufelixUsersCloud &&
                typeof window
                    .JufelixUsersCloud
                    .deleteUser ===
                    "function"
            ) {

                await window
                    .JufelixUsersCloud
                    .deleteUser(
                        user.uid ||
                        user.id
                    );
            }


            users =
                users.filter(
                    function (
                        item
                    ) {

                        return (
                            String(
                                item.id
                            ) !==
                            String(
                                id
                            )
                        );
                    }
                );


            writeUsers(
                users
            );


            renderUsers();


            showMessage(
                "User removed successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Delete user failed:",
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

        const branches =
            readArray(
                BRANCHES_KEY
            );


        const activeBranches =
            branches.filter(
                function (
                    branch
                ) {

                    return (
                        String(
                            branch.status ||
                            "active"
                        )
                            .toLowerCase() ===
                        "active"
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
                                        branch.branchName ||
                                        branch.name ||
                                        "Branch"
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
                                        branch.branchName ||
                                        branch.name ||
                                        "Branch"
                                    )}
                                </option>
                            `;
                        }
                    )
                    .join("");


            if (
                previous
            ) {

                el.branchFilter.value =
                    previous;
            }
        }
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
            el.password
        ) {

            el.password.required =
                true;

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
       DEFAULT ADMIN
    ========================================== */

    function ensureAdmin() {

        let users =
            readArray(
                USERS_KEY
            );


        const exists =
            users.some(
                function (
                    user
                ) {

                    return (
                        String(
                            user.username ||
                            ""
                        )
                            .toLowerCase() ===
                        "admin"
                    );
                }
            );


        if (
            exists
        ) {

            return;
        }


        users.push({

            id:
                "user-admin",

            fullName:
                "System Administrator",

            name:
                "System Administrator",

            username:
                "admin",

            password:
                "admin123",

            role:
                "admin",

            branchId:
                "head-office",

            branchName:
                "Head Office",

            status:
                "active",

            createdAt:
                new Date()
                    .toISOString()
        });


        writeUsers(
            users
        );
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


        } catch (error) {

            console.error(
                "Unable to read:",
                key,
                error
            );


            return [];
        }
    }


    function writeUsers(
        users
    ) {

        try {

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(
                    users
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
                                users
                        }
                    }
                )
            );


            return true;


        } catch (error) {

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

        let role =
            String(
                value ||
                ""
            )
                .trim()
                .toLowerCase();


        const aliases = {

            administrator:
                "admin",

            admin:
                "admin",

            manager:
                "manager",

            sales:
                "sales",

            "sales officer":
                "sales",

            "sales-officer":
                "sales",

            "sales personnel":
                "sales",

            cashier:
                "cashier",

            stockkeeper:
                "stockkeeper",

            "stock keeper":
                "stockkeeper",

            "store keeper":
                "stockkeeper",

            accountant:
                "accountant"
        };


        return (
            aliases[
                role
            ] ||
            role
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

            sales:
                "Sales Officer",

            cashier:
                "Cashier",

            stockkeeper:
                "Stock Keeper",

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
                : "The user could not be saved."
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

        deleteUser:
            deleteUser,

        resetForm:
            resetForm,

        updateStats:
            updateUserStatistics
    };


})();