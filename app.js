const SUPABASE_URL = "https://alwrrvltxdbnzrquchsh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Oz_Mi93xZbUF7fDRLB6r_g_Lanr0Bci";

const { createClient } = supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


const loginPage = document.getElementById("loginPage");
const dashboardPage = document.getElementById("dashboardPage");

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const logoutButton = document.getElementById("logoutButton");

const adminPanel = document.getElementById("adminPanel");
const userPanel = document.getElementById("userPanel");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userRole = document.getElementById("userRole");

const totalUsers = document.getElementById("totalUsers");
const activeUsers = document.getElementById("activeUsers");
const inactiveUsers = document.getElementById("inactiveUsers");

const manageUsersButton =
    document.getElementById("manageUsersButton");

const plansButton =
    document.getElementById("plansButton");

const settingsButton =
    document.getElementById("settingsButton");

const userManagement =
    document.getElementById("userManagement");

const plansSection =
    document.getElementById("plansSection");

const settingsSection =
    document.getElementById("settingsSection");

const closeUserManagement =
    document.getElementById("closeUserManagement");

const closePlans =
    document.getElementById("closePlans");

const closeSettings =
    document.getElementById("closeSettings");

const userList =
    document.getElementById("userList");


function showLogin() {

    loginPage.classList.remove("hidden");

    dashboardPage.classList.add("hidden");
}


function showDashboard() {

    loginPage.classList.add("hidden");

    dashboardPage.classList.remove("hidden");
}


function hideAdminSections() {

    userManagement.classList.add("hidden");

    plansSection.classList.add("hidden");

    settingsSection.classList.add("hidden");
}


async function loadProfile(user) {

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {

        console.error(error);

        throw new Error(
            "Profile tidak dapat dibaca."
        );
    }

    if (data.status !== "active") {

        await supabaseClient.auth.signOut();

        throw new Error(
            "Akun Anda tidak aktif."
        );
    }

    userName.textContent =
        data.name || "User";

    userEmail.textContent =
        data.email || user.email;

    userRole.textContent =
        data.role === "admin"
            ? "Administrator"
            : "User";


    if (data.role === "admin") {

        adminPanel.classList.remove("hidden");

        userPanel.classList.add("hidden");

        await loadAdminStats();

    } else {

        adminPanel.classList.add("hidden");

        userPanel.classList.remove("hidden");
    }

    showDashboard();
}


async function loadAdminStats() {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("role, status");

    if (error) {

        console.error(error);

        return;
    }

    const users =
        data.filter(
            item => item.role === "user"
        );

    const active =
        users.filter(
            item => item.status === "active"
        );

    const inactive =
        users.filter(
            item => item.status === "inactive"
        );

    totalUsers.textContent =
        users.length;

    activeUsers.textContent =
        active.length;

    inactiveUsers.textContent =
        inactive.length;
}


async function loadUsers() {

    userList.innerHTML =
        '<div class="loading-user">Memuat user...</div>';

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, email, name, role, status, plan, expired_at"
            )
            .eq("role", "user")
            .order("created_at", {
                ascending: false
            });

    if (error) {

        console.error(error);

        userList.innerHTML =
            '<div class="loading-user">Gagal memuat user.</div>';

        return;
    }

    if (!data || data.length === 0) {

        userList.innerHTML =
            '<div class="loading-user">Belum ada user.</div>';

        return;
    }

    userList.innerHTML = "";

    data.forEach(user => {

        const item =
            document.createElement("div");

        item.className = "user-item";


        const info =
            document.createElement("div");

        info.className = "user-info";


        const name =
            document.createElement("strong");

        name.textContent =
            user.name || "User";


        const email =
            document.createElement("span");

        email.textContent =
            user.email || "-";


        const plan =
            document.createElement("span");

        plan.textContent =
            "Paket: " +
            (user.plan || "free").toUpperCase();


        const expired =
            document.createElement("span");

        if (user.expired_at) {

            const date =
                new Date(user.expired_at);

            expired.textContent =
                "Berlaku sampai: " +
                date.toLocaleDateString(
                    "id-ID"
                );

        } else {

            expired.textContent =
                "Masa berlaku: Tidak terbatas";
        }


        info.appendChild(name);
        info.appendChild(email);
        info.appendChild(plan);
        info.appendChild(expired);


        const actions =
            document.createElement("div");

        actions.className = "user-actions";


        const status =
            document.createElement("span");

        status.className =
            "user-status " +
            (
                user.status === "active"
                    ? "status-active"
                    : "status-inactive"
            );

        status.textContent =
            user.status === "active"
                ? "AKTIF"
                : "NONAKTIF";


        const edit =
            document.createElement("button");

        edit.className =
            "user-toggle";

        edit.textContent =
            "Edit";

        edit.style.background =
            "#394565";

        edit.addEventListener(
            "click",
            () => editUser(user)
        );


        const toggle =
            document.createElement("button");

        toggle.className =
            "user-toggle";

        toggle.textContent =
            user.status === "active"
                ? "Nonaktifkan"
                : "Aktifkan";


        toggle.addEventListener(
            "click",
            () => toggleUserStatus(user)
        );


        actions.appendChild(status);
        actions.appendChild(edit);
        actions.appendChild(toggle);


        item.appendChild(info);
        item.appendChild(actions);


        userList.appendChild(item);

    });
}
async function editUser(user) {

    const currentName =
        user.name || "";

    const currentPlan =
        user.plan || "free";

    const currentExpired =
        user.expired_at
            ? new Date(user.expired_at)
                .toISOString()
                .split("T")[0]
            : "";


    const name =
        prompt(
            "Nama user:",
            currentName
        );

    if (name === null) {
        return;
    }


    const plan =
        prompt(
            "Paket user:\n\nFREE\nPRO\nPREMIUM",
            currentPlan.toUpperCase()
        );

    if (plan === null) {
        return;
    }


    const normalizedPlan =
        plan.trim().toLowerCase();


    if (
        ![
            "free",
            "pro",
            "premium"
        ].includes(normalizedPlan)
    ) {

        alert(
            "Paket tidak valid.\nGunakan FREE, PRO, atau PREMIUM."
        );

        return;
    }


    const expiredInput =
        prompt(
            "Tanggal kedaluwarsa:\n\n" +
            "Format: YYYY-MM-DD\n" +
            "Kosongkan jika tidak terbatas.",
            currentExpired
        );

    if (expiredInput === null) {
        return;
    }


    let expiredAt = null;


    if (expiredInput.trim() !== "") {

        const date =
            new Date(
                expiredInput.trim() +
                "T23:59:59"
            );

        if (isNaN(date.getTime())) {

            alert(
                "Format tanggal tidak valid."
            );

            return;
        }

        expiredAt =
            date.toISOString();
    }


    const { error } =
        await supabaseClient
            .from("profiles")
            .update({
                name:
                    name.trim() || "User",

                plan:
                    normalizedPlan,

                expired_at:
                    expiredAt,

                updated_at:
                    new Date().toISOString()
            })
            .eq("id", user.id);


    if (error) {

        console.error(error);

        alert(
            "Gagal menyimpan perubahan user."
        );

        return;
    }


    alert(
        "Data user berhasil diperbarui."
    );


    await loadUsers();

    await loadAdminStats();
}


async function toggleUserStatus(user) {

    const newStatus =
        user.status === "active"
            ? "inactive"
            : "active";


    const { error } =
        await supabaseClient
            .from("profiles")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", user.id);


    if (error) {

        console.error(error);

        alert(
            "Gagal mengubah status user."
        );

        return;
    }


    await loadUsers();

    await loadAdminStats();
}


manageUsersButton.addEventListener(
    "click",
    async function() {

        hideAdminSections();

        userManagement.classList.remove(
            "hidden"
        );

        await loadUsers();
    }
);


plansButton.addEventListener(
    "click",
    function() {

        hideAdminSections();

        plansSection.classList.remove(
            "hidden"
        );
    }
);


settingsButton.addEventListener(
    "click",
    function() {

        hideAdminSections();

        settingsSection.classList.remove(
            "hidden"
        );
    }
);


closeUserManagement.addEventListener(
    "click",
    function() {

        userManagement.classList.add(
            "hidden"
        );
    }
);


closePlans.addEventListener(
    "click",
    function() {

        plansSection.classList.add(
            "hidden"
        );
    }
);


closeSettings.addEventListener(
    "click",
    function() {

        settingsSection.classList.add(
            "hidden"
        );
    }
);


loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        loginButton.disabled = true;

        loginButton.textContent =
            "LOGIN...";

        loginMessage.textContent = "";


        const { data, error } =
            await supabaseClient.auth
                .signInWithPassword({
                    email,
                    password
                });


        if (error) {

            loginMessage.textContent =
                error.message;

            loginButton.disabled =
                false;

            loginButton.textContent =
                "LOGIN";

            return;
        }


        try {

            await loadProfile(
                data.user
            );

        } catch (error) {

            loginMessage.textContent =
                error.message;

            await supabaseClient.auth.signOut();
        }


        loginButton.disabled =
            false;

        loginButton.textContent =
            "LOGIN";
    }
);


logoutButton.addEventListener(
    "click",
    async function() {

        await supabaseClient.auth.signOut();

        hideAdminSections();

        showLogin();

        loginForm.reset();

        loginMessage.textContent = "";
    }
);


async function checkSession() {

    const {
        data: {
            session
        }
    } =
        await supabaseClient.auth
            .getSession();


    if (!session) {

        showLogin();

        return;
    }


    try {

        await loadProfile(
            session.user
        );

    } catch (error) {

        console.error(error);

        await supabaseClient.auth.signOut();

        showLogin();
    }
}


supabaseClient.auth.onAuthStateChange(
    function(event) {

        if (event === "SIGNED_OUT") {

            showLogin();
        }
    }
);


checkSession();



// ===============================
// TAMBAH USER ADMIN
// ===============================

const addUserButton =
    document.getElementById("addUserButton");

const addUserForm =
    document.getElementById("addUserForm");

const cancelAddUser =
    document.getElementById("cancelAddUser");

const createUserButton =
    document.getElementById("createUserButton");

const addUserMessage =
    document.getElementById("addUserMessage");


if (addUserButton) {

    addUserButton.addEventListener(
        "click",
        function () {

            addUserForm.classList.remove("hidden");

            addUserMessage.textContent = "";

            document
                .getElementById("newUserName")
                .focus();

        }
    );

}


if (cancelAddUser) {

    cancelAddUser.addEventListener(
        "click",
        function () {

            addUserForm.classList.add("hidden");

            document
                .getElementById("newUserName")
                .value = "";

            document
                .getElementById("newUserEmail")
                .value = "";

            document
                .getElementById("newUserPassword")
                .value = "";

            document
                .getElementById("newUserPlan")
                .value = "free";

            addUserMessage.textContent = "";

        }
    );

}


if (createUserButton) {

    createUserButton.addEventListener(
        "click",
        async function () {

            const name =
                document
                    .getElementById("newUserName")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("newUserEmail")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("newUserPassword")
                    .value;

            const plan =
                document
                    .getElementById("newUserPlan")
                    .value;


            if (!email || !password) {

                addUserMessage.textContent =
                    "Email dan password wajib diisi.";

                return;

            }


            if (password.length < 6) {

                addUserMessage.textContent =
                    "Password minimal 6 karakter.";

                return;

            }


            createUserButton.disabled = true;

            createUserButton.textContent =
                "Membuat User...";

            addUserMessage.textContent =
                "Sedang membuat akun...";


            try {

                const {
                    data,
                    error
                } =
                    await supabaseClient
                        .functions
                        .invoke(
                            "admin-create-user",
                            {
                                body: {
                                    name,
                                    email,
                                    password,
                                    plan
                                }
                            }
                        );


                if (error) {
                    throw error;
                }


                if (!data || !data.success) {

                    throw new Error(
                        data?.error ||
                        "User gagal dibuat."
                    );

                }


                addUserMessage.textContent =
                    "User berhasil dibuat.";


                document
                    .getElementById("newUserName")
                    .value = "";

                document
                    .getElementById("newUserEmail")
                    .value = "";

                document
                    .getElementById("newUserPassword")
                    .value = "";

                document
                    .getElementById("newUserPlan")
                    .value = "free";


                await loadUsers();


            } catch (error) {

                console.error(
                    "Create user error:",
                    error
                );

                addUserMessage.textContent =
                    error.message ||
                    "Gagal membuat user.";

            } finally {

                createUserButton.disabled = false;

                createUserButton.textContent =
                    "Buat User";

            }

        }
    );

}
