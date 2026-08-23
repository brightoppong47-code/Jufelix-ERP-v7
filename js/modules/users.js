/* ==========================================
   JUFELIX ERP v7.0 PROFESSIONAL
   USERS MANAGEMENT MODULE

   File:
   js/modules/users.js

   Version: 520

   + Firebase user creation
   + Firebase profile updates
   + Firebase profile deletion
   + Branch assignment
   + Role normalization
   + LocalStorage mirror
   + Safer edit/update flow
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

    let elements =
        {};


    /* ==========================================
       START
    ========================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeUsers
    );


    /* ==========================================
       INITIALIZE
    ========================================== */

    function initializeUsers() {

        cacheElements();

        ensureLocalAdmin();

        loadBranches();

        connectEvents();

        renderUsers();

        console.log(
            "✅ Jufelix Users module v520 loaded."
        );
    }


    /* ==========================================
       ELEMENTS
    ========================================== */

    function cacheElements() {

        elements = {

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

    function connectEvents() {

        if (
            elements.form
        ) {

            elements.form.addEventListener(
                "submit",
                saveUser
            );
        }


        if (
            elements.reset
        ) {

            elements.reset.addEventListener(
                "click",
                function (
                    event
                ) {

                    event.preventDefault();

                    resetForm();
                }
            );
        }


        [
            elements.search,
            elements.roleFilter,
            elements.branchFilter
        ]
            .filter(Boolean)
            .forEach(
                function (
                    element
                ) {

                    const eventName =
                        element.tagName ===
                        "INPUT"
                            ? "input"
                            : "change";


                    element.addEventListener(
                        eventName,
                        renderUsers
                    );
                }
            );


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
                    BRANCHES_KEY
                ) {

                    loadBranches();
                }


                if (
                    detail.key ===
                    USERS_KEY
                ) {

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


        const selectedBranchId =
            getValue(
                elements.branch
            ) ||
            "head-office";


        const branches =
            readArray(
                BRANCHES_KEY
            );


        const selectedBranch =
            branches.find(
                function (
                    branch
                ) {

                    return (
                        String(
                            branch.id
                        ) ===
                        String(
                            selectedBranchId
                        )
                    );
                }
            );


        const userData = {

            fullName:
                getValue(
                    elements.fullName
                ),

            name:
                getValue(
                    elements.fullName
                ),

            email:
                getValue(
                    elements.email
                )
                    .toLowerCase(),

            phone:
                getValue(
                    elements.phone
                ),

            username:
                getValue(
                    elements.username
                )
                    .toLowerCase(),

            password:
                elements.password
                    ? elements.password.value
                    : "",

            role:
                normalizeRole(
                    getValue(
                        elements.role
                    )
                ),

            branchId:
                selectedBranchId,

            branchName:
                selectedBranch
                    ? (
                        selectedBranch
                            .branchName ||
                        selectedBranch
                            .name ||
                        "Branch"
                    )
                    : (
                        elements.branch &&
                        elements.branch
                            .selectedOptions &&
                        elements.branch
                            .selectedOptions[0]
                            ? elements.branch
                                .selectedOptions[0]
                                .textContent
                                .trim()
                            : "Head Office"
                    ),

            status:
                getValue(
                    elements.status
                ) ||
                "active"
        };


        /* ======================================
           VALIDATION
        ====================================== */

        if (
            !userData.fullName
        ) {

            showMessage(
                "Enter the user full name.",
                "error"
            );

            return;
        }


        if (
            !userData.email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    userData.email
                )
        ) {

            showMessage(
                "Enter a valid email address.",
                "error"
            );

            return;
        }


        if (
            !userData.username
        ) {

            userData.username =
                userData.email
                    .split("@")[0];
        }


        if (
            !userData.role
        ) {

            showMessage(
                "Select a user role.",
                "error"
            );

            return;
        }


        if (
            !editingId &&
            userData.password.length <
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
                            userData.email &&

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
                            userData.username &&

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

            let cloudUser =
                null;


            /* ==================================
               CREATE NEW USER
            ================================== */

            if (
                !editingId
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


                cloudUser =
                    await window
                        .JufelixUsersCloud
                        .createUser(
                            userData
                        );


                userData.id =
                    String(
                        (
                            cloudUser &&
                            (
                                cloudUser.uid ||
                                cloudUser.id
                            )
                        ) ||
                        ""
                    );


                userData.uid =
                    userData.id;


                if (
                    !userData.id
                ) {

                    throw new Error(
                        "Firebase did not return a user ID."
                    );
                }
            }


            /* ==================================
               UPDATE EXISTING USER
            ================================== */

            else {

                userData.id =
                    String(
                        editingId
                    );


                const existingUser =
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


                userData.uid =
                    existingUser
                        ? (
                            existingUser.uid ||
                            existingUser.id
                        )
                        : editingId;


                if (
                    window.JufelixUsersCloud &&
                    typeof window
                        .JufelixUsersCloud
                        .updateUser ===
                        "function"
                ) {

                    cloudUser =
                        await window
                            .JufelixUsersCloud
                            .updateUser(
                                userData.uid,
                                userData
                            );
                }
            }


            users =
                readArray(
                    USERS_KEY
                );


            const existingIndex =
                users.findIndex(
                    function (
                        user
                    ) {

                        return (
                            String(
                                user.id
                            ) ===
                            String(
                                editingId ||
                                userData.id
                            )
                        );
                    }
                );


            const now =
                new Date()
                    .toISOString();


            const record = {

                ...(
                    existingIndex >=
                    0
                        ? users[
                            existingIndex
                        ]
                        : {}
                ),

                ...userData,

                id:
                    String(
                        userData.id
                    ),

                uid:
                    String(
                        userData.uid ||
                        userData.id
                    ),

                updatedAt:
                    now
            };


            /*
             * Password is needed only while
             * creating Firebase Authentication.
             * Do not keep a new blank password
             * during editing.
             */

            if (
                existingIndex >=
                0 &&
                !userData.password
            ) {

                record.password =
                    users[
                        existingIndex
                    ].password ||
                    "";
            }


            if (
                existingIndex >=
                0
            ) {

                users[
                    existingIndex
                ] =
                    record;

            } else {

                record.createdAt =
                    record.createdAt ||
                    now;


                users.push(
                    record
                );
            }


            saveUsers(
                users
            );


            showMessage(

                editingId
                    ? "User updated successfully."
                    : "User created successfully.",

                "success"
            );


            resetForm();

            renderUsers();


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
       LOAD BRANCHES
    ========================================== */

    function loadBranches() {

        if (
            !elements.branch
        ) {

            return;
        }


        const previousValue =
            elements.branch.value;


        let branches =
            readArray(
                BRANCHES_KEY
            );


        if (
            !branches.some(
                function (
                    branch
                ) {

                    return (
                        String(
                            branch.id
                        ) ===
                        "head-office"
                    );
                }
            )
        ) {

            branches.unshift({

                id:
                    "head-office",

                name:
                    "Head Office",

                branchName:
                    "Head Office",

                status:
                    "active"
            });
        }


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


        elements.branch.innerHTML =
            '<option value="">Select Branch</option>' +
            activeBranches
                .map(
                    function (
                        branch
                    ) {

                        return (
                            '<option value="' +
                            escapeHTML(
                                branch.id
                            ) +
                            '">' +
                            escapeHTML(
                                branch.branchName ||
                                branch.name ||
                                "Branch"
                            ) +
                            "</option>"
                        );
                    }
                )
                .join("");


        if (
            previousValue &&
            activeBranches.some(
                function (
                    branch
                ) {

                    return (
                        String(
                            branch.id
                        ) ===
                        String(
                            previousValue
                        )
                    );
                }
            )
        ) {

            elements.branch.value =
                previousValue;
        }
    }


    /* ==========================================
       RENDER USERS
    ========================================== */

    function renderUsers() {

        if (
            !elements.tbody
        ) {

            return;
        }


        let users =
            readArray(
                USERS_KEY
            );


        const search =
            getValue(
                elements.search
            )
                .toLowerCase();


        const roleFilter =
            normalizeRole(
                getValue(
                    elements.roleFilter
                )
            );


        const branchFilter =
            getValue(
                elements.branchFilter
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
            !users.length
        ) {

            elements.tbody.innerHTML =
                '<tr>' +
                '<td colspan="8" ' +
                'style="text-align:center;padding:28px">' +
                "No users found." +
                "</td>" +
                "</tr>";


            return;
        }


        elements.tbody.innerHTML =
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


        elements.tbody
            .querySelectorAll(
                "[data-edit]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            editUser(
                                button.dataset
                                    .edit
                            );
                        };
                }
            );


        elements.tbody
            .querySelectorAll(
                "[data-delete]"
            )
            .forEach(
                function (
                    button
                ) {

                    button.onclick =
                        function () {

                            deleteUser(
                                button.dataset
                                    .delete
                            );
                        };
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


        setElementValue(
            elements.fullName,
            user.fullName ||
            user.name
        );


        setElementValue(
            elements.email,
            user.email
        );


        setElementValue(
            elements.phone,
            user.phone
        );


        setElementValue(
            elements.username,
            user.username
        );


        setElementValue(
            elements.role,
            normalizeRole(
                user.role
            )
        );


        setElementValue(
            elements.branch,
            user.branchId
        );


        setElementValue(
            elements.status,
            user.status ||
            "active"
        );


        if (
            elements.password
        ) {

            elements.password.value =
                "";

            elements.password.required =
                false;

            elements.password.placeholder =
                "Leave blank to keep existing password";
        }


        if (
            elements.save
        ) {

            elements.save.textContent =
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
            window.confirm(
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


            saveUsers(
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
       RESET FORM
    ========================================== */

    function resetForm() {

        editingId =
            null;


        if (
            elements.form
        ) {

            elements.form.reset();
        }


        if (
            elements.password
        ) {

            elements.password.required =
                true;

            elements.password.placeholder =
                "Enter password";
        }


        if (
            elements.status
        ) {

            elements.status.value =
                "active";
        }


        if (
            elements.save
        ) {

            elements.save.textContent =
                "💾 Save User";
        }
    }


    /* ==========================================
       LOCAL ADMIN
    ========================================== */

    function ensureLocalAdmin() {

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


        saveUsers(
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


    function saveUsers(
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
       ROLE NORMALIZATION
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


    function setElementValue(
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
        saving
    ) {

        if (
            !elements.save
        ) {

            return;
        }


        elements.save.disabled =
            saving;


        elements.save.textContent =
            saving
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


        if (
            code.includes(
                "requires-recent-login"
            )
        ) {

            return "Firebase requires the account to sign in again before this operation.";
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
            elements.message
        ) {

            elements.message.textContent =
                text;

            elements.message.className =
                "user-message " +
                type;

            elements.message.style.display =
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

        resetForm:
            resetForm,

        editUser:
            editUser,

        deleteUser:
            deleteUser
    };


})();