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


function showLogin() {
    loginPage.classList.remove("hidden");
    dashboardPage.classList.add("hidden");
}


function showDashboard() {
    loginPage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");
}


async function loadProfile(user) {

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error(error);
        throw new Error("Profile tidak dapat dibaca.");
    }

    if (data.status !== "active") {
        await supabaseClient.auth.signOut();
        throw new Error("Akun Anda tidak aktif.");
    }

    userName.textContent = data.name || "User";
    userEmail.textContent = data.email || user.email;

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

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("role, status");

    if (error) {
        console.error(error);
        return;
    }

    const users = data.filter(item => item.role === "user");

    const active = users.filter(
        item => item.status === "active"
    );

    const inactive = users.filter(
        item => item.status === "inactive"
    );

    totalUsers.textContent = users.length;
    activeUsers.textContent = active.length;
    inactiveUsers.textContent = inactive.length;
}


loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    loginButton.disabled = true;
    loginButton.textContent = "LOGIN...";

    loginMessage.textContent = "";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {

        loginMessage.textContent = error.message;

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";

        return;
    }

    try {

        await loadProfile(data.user);

    } catch (error) {

        loginMessage.textContent = error.message;

        await supabaseClient.auth.signOut();

    }

    loginButton.disabled = false;
    loginButton.textContent = "LOGIN";
});


logoutButton.addEventListener("click", async function() {

    await supabaseClient.auth.signOut();

    showLogin();

    loginForm.reset();

    loginMessage.textContent = "";
});


async function checkSession() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        showLogin();
        return;
    }

    try {

        await loadProfile(session.user);

    } catch (error) {

        console.error(error);

        await supabaseClient.auth.signOut();

        showLogin();

    }
}


supabaseClient.auth.onAuthStateChange(
    async function(event, session) {

        if (event === "SIGNED_OUT") {
            showLogin();
        }

    }
);


checkSession();
