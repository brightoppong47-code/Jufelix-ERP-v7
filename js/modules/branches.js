/* ==========================================
   JUFELIX ERP v7.0
   Complete Branch Management Module
   File: js/modules/branches.js
========================================== */

(function () {
    "use strict";

    const BRANCHES_KEY =
        "jufelix_v7_branches";

    let branches = [];
    let editingBranchId = null;

    const elements = {};

    document.addEventListener(
        "DOMContentLoaded",
        initializeBranches
    );


    function initializeBranches() {
        getElements();

        if (!elements.branchForm) {
            console.error(
                "Branches error: #branchForm was not found."
            );

            return;
        }

        loadBranches();
        connectEvents();
        resetBranchForm();
        refreshBranches();
    }


    function getElements() {
        elements.branchForm =
            document.getElementById(
                "branchForm"
            );

        elements.branchTableBody =
            document.getElementById(
                "branchTableBody"
            );

        elements.branchSearch =
            document.getElementById(
                "branchSearch"
            );

        elements.branchStatusFilter =
            document.getElementById(
                "branchStatusFilter"
            );

        elements.clearBranchButton =
            document.getElementById(
                "clearBranchButton"
            );

        elements.saveBranchButton =
            document.getElementById(
                "saveBranchButton"
            );

        elements.branchFormTitle =
            document.getElementById(
                "branchFormTitle"
            );
    }


    function connectEvents() {
        elements.branchForm.addEventListener(
            "submit",
            saveBranch
        );

        if (elements.clearBranchButton) {
            elements.clearBranchButton.addEventListener(
                "click",
                resetBranchForm
            );
        }

        if (elements.branchSearch) {
            elements.branchSearch.addEventListener(
                "input",
                displayBranches
            );
        }

        if (elements.branchStatusFilter) {
            elements.branchStatusFilter.addEventListener(
                "change",
                displayBranches
            );
        }
    }


    /* ==========================================
       SAVE BRANCH
    ========================================== */

    function saveBranch(event) {
        event.preventDefault();

        const branchData = {
            name:
                getValue("branchName"),

            code:
                getValue("branchCode")
                    .toUpperCase(),

            manager:
                getValue("branchManager"),

            phone:
                getValue("branchPhone"),

            email:
                getValue("branchEmail"),

            status:
                getValue("branchStatus") ||
                "active",

            type:
                getValue("branchType") ||
                "branch",

            openingDate:
                getValue(
                    "branchOpeningDate"
                ),

            address:
                getValue("branchAddress"),

            notes:
                getValue("branchNotes")
        };

        if (!branchData.name) {
            alert("Enter the branch name.");
            return;
        }

        if (!branchData.code) {
            alert("Enter the branch code.");
            return;
        }

        if (!branchData.phone) {
            alert(
                "Enter the branch phone number."
            );

            return;
        }

        if (!branchData.address) {
            alert(
                "Enter the branch address."
            );

            return;
        }

        const duplicateCode =
            branches.find(
                function (branch) {
                    return (
                        String(branch.id) !==
                            String(
                                editingBranchId
                            ) &&
                        String(
                            branch.code || ""
                        )
                            .trim()
                            .toUpperCase() ===
                            branchData.code
                    );
                }
            );

        if (duplicateCode) {
            alert(
                "Another branch already uses this branch code."
            );

            return;
        }

        if (
            branchData.type ===
            "head-office"
        ) {
            const existingHeadOffice =
                branches.find(
                    function (branch) {
                        const isHeadOffice =
                            branch.isHeadOffice ===
                                true ||
                            String(
                                branch.type || ""
                            ).toLowerCase() ===
                                "head-office";

                        return (
                            String(branch.id) !==
                                String(
                                    editingBranchId
                                ) &&
                            isHeadOffice
                        );
                    }
                );

            if (existingHeadOffice) {
                alert(
                    "Only one Head Office is allowed. Edit the existing Head Office instead."
                );

                return;
            }
        }

        const wasEditing =
            editingBranchId !== null;

        if (wasEditing) {
            updateBranch(branchData);
        } else {
            createBranch(branchData);
        }

        saveBranches();
        refreshBranches();
        resetBranchForm();

        alert(
            wasEditing
                ? "Branch updated successfully."
                : "Branch saved successfully."
        );
    }


    function createBranch(branchData) {
        const currentTime =
            new Date().toISOString();

        branches.push({
            id:
                "branch-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 7),

            branchName:
                branchData.name,

            name:
                branchData.name,

            code:
                branchData.code,

            manager:
                branchData.manager,

            phone:
                branchData.phone,

            email:
                branchData.email,

            status:
                branchData.status,

            type:
                branchData.type,

            isHeadOffice:
                branchData.type ===
                "head-office",

            openingDate:
                branchData.openingDate,

            address:
                branchData.address,

            notes:
                branchData.notes,

            createdAt:
                currentTime,

            updatedAt:
                currentTime
        });
    }


    function updateBranch(branchData) {
        const branchIndex =
            branches.findIndex(
                function (branch) {
                    return (
                        String(branch.id) ===
                        String(editingBranchId)
                    );
                }
            );

        if (branchIndex === -1) {
            alert("Branch not found.");
            return;
        }

        const existingBranch =
            branches[branchIndex];

        branches[branchIndex] = {
            ...existingBranch,

            branchName:
                branchData.name,

            name:
                branchData.name,

            code:
                branchData.code,

            manager:
                branchData.manager,

            phone:
                branchData.phone,

            email:
                branchData.email,

            status:
                branchData.status,

            type:
                branchData.type,

            isHeadOffice:
                branchData.type ===
                "head-office",

            openingDate:
                branchData.openingDate,

            address:
                branchData.address,

            notes:
                branchData.notes,

            id:
                existingBranch.id,

            createdAt:
                existingBranch.createdAt ||
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };
    }


    /* ==========================================
       EDIT AND DELETE
    ========================================== */

    function editBranch(branchId) {
        const branch =
            branches.find(
                function (item) {
                    return (
                        String(item.id) ===
                        String(branchId)
                    );
                }
            );

        if (!branch) {
            alert("Branch not found.");
            return;
        }

        editingBranchId =
            branch.id;

        setValue(
            "branchId",
            branch.id
        );

        setValue(
            "branchName",
            branch.branchName ||
            branch.name
        );

        setValue(
            "branchCode",
            branch.code
        );

        setValue(
            "branchManager",
            branch.manager
        );

        setValue(
            "branchPhone",
            branch.phone
        );

        setValue(
            "branchEmail",
            branch.email
        );

        setValue(
            "branchStatus",
            branch.status ||
            "active"
        );

        setValue(
            "branchType",
            getBranchType(branch)
        );

        setValue(
            "branchOpeningDate",
            branch.openingDate
        );

        setValue(
            "branchAddress",
            branch.address
        );

        setValue(
            "branchNotes",
            branch.notes
        );

        if (elements.branchFormTitle) {
            elements.branchFormTitle.textContent =
                "Edit Branch";
        }

        if (elements.saveBranchButton) {
            elements.saveBranchButton.textContent =
                "Update Branch";
        }

        elements.branchForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    function deleteBranch(branchId) {
        const branch =
            branches.find(
                function (item) {
                    return (
                        String(item.id) ===
                        String(branchId)
                    );
                }
            );

        if (!branch) {
            alert("Branch not found.");
            return;
        }

        if (
            branch.isHeadOffice === true ||
            getBranchType(branch) ===
                "head-office"
        ) {
            alert(
                "The Head Office cannot be deleted. Change its type first or edit its information."
            );

            return;
        }

        const confirmed =
            confirm(
                `Delete "${
                    branch.branchName ||
                    branch.name
                }" permanently?`
            );

        if (!confirmed) {
            return;
        }

        branches =
            branches.filter(
                function (item) {
                    return (
                        String(item.id) !==
                        String(branchId)
                    );
                }
            );

        saveBranches();

        if (
            String(editingBranchId) ===
            String(branchId)
        ) {
            resetBranchForm();
        }

        refreshBranches();

        alert(
            "Branch deleted successfully."
        );
    }


    /* ==========================================
       DISPLAY BRANCHES
    ========================================== */

    function displayBranches() {
        if (!elements.branchTableBody) {
            return;
        }

        const searchTerm =
            String(
                elements.branchSearch
                    ? elements.branchSearch
                        .value
                    : ""
            )
                .trim()
                .toLowerCase();

        const statusFilter =
            elements.branchStatusFilter
                ? elements
                    .branchStatusFilter
                    .value
                : "";

        const filteredBranches =
            branches.filter(
                function (branch) {
                    const searchableText = [
                        branch.branchName,
                        branch.name,
                        branch.code,
                        branch.manager,
                        branch.phone,
                        branch.email,
                        branch.address
                    ]
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !searchTerm ||
                        searchableText.includes(
                            searchTerm
                        );

                    const matchesStatus =
                        !statusFilter ||
                        String(
                            branch.status ||
                            "active"
                        ).toLowerCase() ===
                            statusFilter;

                    return (
                        matchesSearch &&
                        matchesStatus
                    );
                }
            );

        filteredBranches.sort(
            function (
                firstBranch,
                secondBranch
            ) {
                return String(
                    firstBranch.branchName ||
                    firstBranch.name ||
                    ""
                ).localeCompare(
                    String(
                        secondBranch
                            .branchName ||
                        secondBranch.name ||
                        ""
                    )
                );
            }
        );

        if (
            filteredBranches.length === 0
        ) {
            elements.branchTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:30px;
                            color:#888;
                        "
                    >
                        No matching branches found.
                    </td>
                </tr>
            `;

            return;
        }

        elements.branchTableBody.innerHTML =
            filteredBranches
                .map(
                    function (branch) {
                        const status =
                            String(
                                branch.status ||
                                "active"
                            ).toLowerCase();

                        return `
                            <tr>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            branch.branchName ||
                                            branch.name ||
                                            "Unnamed Branch"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        branch.code ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        formatBranchType(
                                            getBranchType(
                                                branch
                                            )
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        branch.manager ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        branch.phone ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        branch.address ||
                                        "—"
                                    )}
                                </td>

                                <td>
                                    <span class="${
                                        status === "active"
                                            ? "status-active"
                                            : "status-inactive"
                                    }">
                                        ${
                                            status === "active"
                                                ? "Active"
                                                : "Inactive"
                                        }
                                    </span>
                                </td>

                                <td>

                                    <button
                                        type="button"
                                        onclick="JufelixBranches.editBranch('${escapeAttribute(
                                            branch.id
                                        )}')"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onclick="JufelixBranches.deleteBranch('${escapeAttribute(
                                            branch.id
                                        )}')"
                                    >
                                        Delete
                                    </button>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }


    /* ==========================================
       SUMMARY
    ========================================== */

    function updateBranchSummary() {
        const totalBranches =
            branches.length;

        const activeBranches =
            branches.filter(
                function (branch) {
                    return (
                        String(
                            branch.status ||
                            "active"
                        ).toLowerCase() ===
                        "active"
                    );
                }
            ).length;

        const headOfficeCount =
            branches.filter(
                function (branch) {
                    return (
                        branch.isHeadOffice ===
                            true ||
                        getBranchType(branch) ===
                            "head-office"
                    );
                }
            ).length;

        const inactiveBranches =
            totalBranches -
            activeBranches;

        setText(
            "totalBranches",
            totalBranches
        );

        setText(
            "activeBranches",
            activeBranches
        );

        setText(
            "headOfficeCount",
            headOfficeCount
        );

        setText(
            "inactiveBranches",
            inactiveBranches
        );
    }


    function refreshBranches() {
        updateBranchSummary();
        displayBranches();
    }


    /* ==========================================
       RESET FORM
    ========================================== */

    function resetBranchForm() {
        editingBranchId = null;

        if (elements.branchForm) {
            elements.branchForm.reset();
        }

        setValue(
            "branchId",
            ""
        );

        setValue(
            "branchStatus",
            "active"
        );

        setValue(
            "branchType",
            "branch"
        );

        if (elements.branchFormTitle) {
            elements.branchFormTitle.textContent =
                "Add New Branch";
        }

        if (elements.saveBranchButton) {
            elements.saveBranchButton.textContent =
                "Save Branch";
        }
    }


    /* ==========================================
       STORAGE
    ========================================== */

    function loadBranches() {
        try {
            const storedBranches =
                localStorage.getItem(
                    BRANCHES_KEY
                );

            if (!storedBranches) {
                branches = [];
                return;
            }

            const parsedBranches =
                JSON.parse(
                    storedBranches
                );

            branches =
                Array.isArray(
                    parsedBranches
                )
                    ? parsedBranches
                    : [];
        } catch (error) {
            console.error(
                "Unable to load branches:",
                error
            );

            branches = [];
        }
    }


    function saveBranches() {
        try {
            localStorage.setItem(
                BRANCHES_KEY,
                JSON.stringify(branches)
            );

            document.dispatchEvent(
                new CustomEvent(
                    "jufelix:data-updated",
                    {
                        detail: {
                            key:
                                BRANCHES_KEY,

                            value:
                                branches
                        }
                    }
                )
            );

            return true;
        } catch (error) {
            console.error(
                "Unable to save branches:",
                error
            );

            alert(
                "The branch could not be saved."
            );

            return false;
        }
    }


    /* ==========================================
       HELPERS
    ========================================== */

    function getValue(elementId) {
        const element =
            document.getElementById(
                elementId
            );

        return element
            ? String(
                element.value || ""
            ).trim()
            : "";
    }


    function setValue(
        elementId,
        value
    ) {
        const element =
            document.getElementById(
                elementId
            );

        if (element) {
            element.value =
                value === undefined ||
                value === null
                    ? ""
                    : value;
        }
    }


    function setText(
        elementId,
        value
    ) {
        const element =
            document.getElementById(
                elementId
            );

        if (element) {
            element.textContent =
                value;
        }
    }


    function getBranchType(branch) {
        if (
            branch.isHeadOffice === true
        ) {
            return "head-office";
        }

        return String(
            branch.type || "branch"
        ).toLowerCase();
    }


    function formatBranchType(type) {
        const branchTypes = {
            branch:
                "Regular Branch",

            "head-office":
                "Head Office",

            warehouse:
                "Warehouse"
        };

        return (
            branchTypes[type] ||
            "Regular Branch"
        );
    }


    function escapeHTML(value) {
        return String(
            value === undefined ||
            value === null
                ? ""
                : value
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function escapeAttribute(value) {
        return escapeHTML(value);
    }


    window.JufelixBranches = {
        editBranch:
            editBranch,

        deleteBranch:
            deleteBranch,

        refresh:
            refreshBranches,

        resetForm:
            resetBranchForm
    };

})();