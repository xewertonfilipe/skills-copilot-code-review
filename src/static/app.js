document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  const announcementBanner = document.getElementById("announcement-banner");
  const announcementList = document.getElementById("announcement-list");
  const manageAnnouncementsButton = document.getElementById(
    "manage-announcements-button"
  );
  const announcementsModal = document.getElementById("announcements-modal");
  const closeAnnouncementsModal = document.querySelector(
    ".close-announcements-modal"
  );
  const announcementsMessage = document.getElementById("announcements-message");
  const announcementAdminList = document.getElementById("announcement-admin-list");
  const announcementForm = document.getElementById("announcement-form");
  const announcementIdInput = document.getElementById("announcement-id");
  const announcementMessageInput = document.getElementById("announcement-message");
  const announcementStartDateInput = document.getElementById(
    "announcement-start-date"
  );
  const announcementExpiresDateInput = document.getElementById(
    "announcement-expires-date"
  );
  const announcementSubmitButton = document.getElementById("announcement-submit");
  const announcementCancelEditButton = document.getElementById(
    "announcement-cancel-edit"
  );

  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#fff4e6", textColor: "#9a3412" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fef9c3", textColor: "#854d0e" },
    technology: { label: "Technology", color: "#ede9fe", textColor: "#5b21b6" },
  };

  const timeRanges = {
    morning: { start: "06:00", end: "08:00" },
    afternoon: { start: "15:00", end: "18:00" },
    weekend: { days: ["Saturday", "Sunday"] },
  };

  let allActivities = {};
  let allManagedAnnouncements = [];
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";
  let currentUser = null;

  function getAnnouncementAuthHeaders() {
    if (!currentUser || !currentUser.session_token) {
      return {};
    }

    return {
      Authorization: `Bearer ${currentUser.session_token}`,
    };
  }

  function escapeHtml(value) {
    const text = String(value ?? "");
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function initializeFilters() {
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  function updateAuthUI() {
    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      manageAnnouncementsButton.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      manageAnnouncementsButton.classList.add("hidden");
      displayName.textContent = "";
      closeAnnouncementsModalHandler();
    }

    updateAuthBodyClass();
    fetchActivities();
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  function showAnnouncementMessage(text, type) {
    announcementsMessage.textContent = text;
    announcementsMessage.className = `message ${type}`;
    announcementsMessage.classList.remove("hidden");

    setTimeout(() => {
      announcementsMessage.classList.add("hidden");
    }, 5000);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    setTimeout(() => registrationModal.classList.add("show"), 10);
  }

  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    announcementIdInput.value = "";
    announcementSubmitButton.textContent = "Add Announcement";
    announcementCancelEditButton.classList.add("hidden");
  }

  function openAnnouncementsModal() {
    if (!currentUser) {
      showMessage("Sign in to manage announcements.", "error");
      return;
    }

    announcementsModal.classList.remove("hidden");
    setTimeout(() => announcementsModal.classList.add("show"), 10);
    announcementsMessage.classList.add("hidden");
    resetAnnouncementForm();
    fetchManagedAnnouncements();
  }

  function closeAnnouncementsModalHandler() {
    announcementsModal.classList.remove("show");
    setTimeout(() => {
      announcementsModal.classList.add("hidden");
      resetAnnouncementForm();
    }, 300);
  }

  async function validateUserSession(username) {
    try {
      const response = await fetch(
        `/auth/check-session?username=${encodeURIComponent(
          username
        )}&session_token=${encodeURIComponent(currentUser.session_token || "")}`
      );

      if (!response.ok) {
        logout(false);
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem("currentUser", JSON.stringify(userData));
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  function checkAuthentication() {
    const savedUser = localStorage.getItem("currentUser");
    if (!savedUser) {
      updateAuthBodyClass();
      return;
    }

    try {
      currentUser = JSON.parse(savedUser);
      updateAuthUI();
      validateUserSession(currentUser.username);
    } catch (error) {
      console.error("Error parsing saved user", error);
      logout(false);
    }
  }

  async function login(username, password) {
    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const data = await response.json();
      if (!response.ok) {
        showLoginMessage(data.detail || "Invalid username or password", "error");
        return;
      }

      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
    }
  }

  function logout(showNotice = true) {
    currentUser = null;
    localStorage.removeItem("currentUser");
    updateAuthUI();
    if (showNotice) {
      showMessage("You have been logged out.", "info");
    }
  }

  async function fetchAnnouncements() {
    try {
      const response = await fetch("/announcements");
      const announcements = await response.json();

      if (!response.ok) {
        announcementBanner.classList.add("hidden");
        return;
      }

      renderAnnouncementBanner(announcements);
    } catch (error) {
      console.error("Error loading announcements:", error);
      announcementBanner.classList.add("hidden");
    }
  }

  function renderAnnouncementBanner(announcements) {
    if (!announcements || announcements.length === 0) {
      announcementBanner.classList.add("hidden");
      announcementList.innerHTML = "";
      return;
    }

    announcementBanner.classList.remove("hidden");
    announcementList.innerHTML = announcements
      .map(
        (announcement) => `
          <article class="announcement-chip">
            <span class="announcement-chip-icon" aria-hidden="true">📢</span>
            <div>
                <p>${escapeHtml(announcement.message)}</p>
                <small>Expires ${escapeHtml(announcement.expires_date)}</small>
            </div>
          </article>
        `
      )
      .join("");
  }

  async function fetchManagedAnnouncements() {
    if (!currentUser) {
      return;
    }

    announcementAdminList.innerHTML = `
      <tr>
        <td colspan="4">Loading announcements...</td>
      </tr>
    `;

    try {
      const response = await fetch(
        `/announcements/manage?teacher_username=${encodeURIComponent(
          currentUser.username
        )}`,
        {
          headers: getAnnouncementAuthHeaders(),
        }
      );
      const announcements = await response.json();

      if (!response.ok) {
        showAnnouncementMessage(
          announcements.detail || "Could not load announcements.",
          "error"
        );
        return;
      }

      allManagedAnnouncements = announcements;
      renderManagedAnnouncements();
    } catch (error) {
      console.error("Error loading managed announcements:", error);
      showAnnouncementMessage("Could not load announcements.", "error");
    }
  }

  function renderManagedAnnouncements() {
    if (!allManagedAnnouncements.length) {
      announcementAdminList.innerHTML = `
        <tr>
          <td colspan="4">No announcements yet. Add the first one.</td>
        </tr>
      `;
      return;
    }

    announcementAdminList.innerHTML = allManagedAnnouncements
      .map(
        (announcement) => `
          <tr>
            <td>${escapeHtml(announcement.message)}</td>
            <td>${escapeHtml(announcement.start_date || "-")}</td>
            <td>${escapeHtml(announcement.expires_date)}</td>
            <td class="announcement-actions">
              <button type="button" class="secondary-button announcement-edit" data-announcement-id="${announcement.id}">Edit</button>
              <button type="button" class="danger-button announcement-delete" data-announcement-id="${announcement.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join("");

    announcementAdminList
      .querySelectorAll(".announcement-edit")
      .forEach((button) => {
        button.addEventListener("click", () => {
          startEditingAnnouncement(button.dataset.announcementId);
        });
      });

    announcementAdminList
      .querySelectorAll(".announcement-delete")
      .forEach((button) => {
        button.addEventListener("click", () => {
          handleAnnouncementDelete(button.dataset.announcementId);
        });
      });
  }

  function startEditingAnnouncement(announcementId) {
    const announcement = allManagedAnnouncements.find(
      (item) => item.id === announcementId
    );

    if (!announcement) {
      return;
    }

    announcementIdInput.value = announcement.id;
    announcementMessageInput.value = announcement.message;
    announcementStartDateInput.value = announcement.start_date || "";
    announcementExpiresDateInput.value = announcement.expires_date;
    announcementSubmitButton.textContent = "Save Changes";
    announcementCancelEditButton.classList.remove("hidden");
    announcementMessageInput.focus();
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!currentUser) {
      showAnnouncementMessage("Sign in to manage announcements.", "error");
      return;
    }

    const payload = {
      message: announcementMessageInput.value.trim(),
      start_date: announcementStartDateInput.value || null,
      expires_date: announcementExpiresDateInput.value,
    };

    if (!payload.message || !payload.expires_date) {
      showAnnouncementMessage("Message and expiration date are required.", "error");
      return;
    }

    const editingId = announcementIdInput.value;
    const method = editingId ? "PUT" : "POST";
    const endpoint = editingId
      ? `/announcements/${encodeURIComponent(editingId)}`
      : "/announcements";

    try {
      const response = await fetch(
        `${endpoint}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...getAnnouncementAuthHeaders(),
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        showAnnouncementMessage(data.detail || "Unable to save announcement.", "error");
        return;
      }

      showAnnouncementMessage(
        editingId ? "Announcement updated." : "Announcement created.",
        "success"
      );
      resetAnnouncementForm();
      await fetchManagedAnnouncements();
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      showAnnouncementMessage("Unable to save announcement.", "error");
    }
  }

  async function handleAnnouncementDelete(announcementId) {
    if (!currentUser) {
      return;
    }

    const shouldDelete = window.confirm("Delete this announcement?");
    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(
        `/announcements/${encodeURIComponent(
          announcementId
        )}?teacher_username=${encodeURIComponent(currentUser.username)}`,
        {
          method: "DELETE",
          headers: getAnnouncementAuthHeaders(),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        showAnnouncementMessage(data.detail || "Unable to delete announcement.", "error");
        return;
      }

      showAnnouncementMessage("Announcement deleted.", "success");
      await fetchManagedAnnouncements();
      await fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      showAnnouncementMessage("Unable to delete announcement.", "error");
    }
  }

  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";
    for (let i = 0; i < 9; i += 1) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  function formatSchedule(details) {
    if (!details.schedule_details) {
      return details.schedule;
    }

    const days = details.schedule_details.days.join(", ");
    const formatTime = (time24) => {
      const [hours, minutes] = time24.split(":").map((num) => parseInt(num, 10));
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    };

    const startTime = formatTime(details.schedule_details.start_time);
    const endTime = formatTime(details.schedule_details.end_time);
    return `${days}, ${startTime} - ${endTime}`;
  }

  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("athletic")
    ) {
      return "sports";
    }
    if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative")
    ) {
      return "arts";
    }
    if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education")
    ) {
      return "academic";
    }
    if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service")
    ) {
      return "community";
    }
    if (
      name.includes("coding") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology")
    ) {
      return "technology";
    }
    return "academic";
  }

  async function fetchActivities() {
    showLoadingSkeletons();
    const queryParams = [];

    if (currentDay) {
      queryParams.push(`day=${encodeURIComponent(currentDay)}`);
    }

    if (currentTimeRange && currentTimeRange !== "weekend") {
      const range = timeRanges[currentTimeRange];
      if (range) {
        queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
        queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
      }
    }

    const queryString = queryParams.length ? `?${queryParams.join("&")}` : "";

    try {
      const response = await fetch(`/activities${queryString}`);
      allActivities = await response.json();
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];
    const formattedSchedule = formatSchedule(details);

    activityCard.innerHTML = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
              <li>
                ${email}
                ${
                  currentUser
                    ? `<button class="delete-participant" data-activity="${name}" data-email="${email}" aria-label="Unregister ${email}">✖</button>`
                    : ""
                }
              </li>
            `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `<button class="register-button" data-activity="${name}" ${
                isFull ? "disabled" : ""
              }>${isFull ? "Activity Full" : "Register Student"}</button>`
            : '<div class="auth-notice">Teachers can register students.</div>'
        }
      </div>
    `;

    activityCard.querySelectorAll(".delete-participant").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    const registerButton = activityCard.querySelector(".register-button");
    if (registerButton && !isFull) {
      registerButton.addEventListener("click", () => openRegistrationModal(name));
    }

    activitiesList.appendChild(activityCard);
  }

  function displayFilteredActivities() {
    activitiesList.innerHTML = "";
    const filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);
      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      if (currentTimeRange === "weekend" && details.schedule_details) {
        const isWeekendActivity = details.schedule_details.days.some((day) =>
          timeRanges.weekend.days.includes(day)
        );
        if (!isWeekendActivity) {
          return;
        }
      }

      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (searchQuery && !searchableContent.includes(searchQuery.toLowerCase())) {
        return;
      }

      filteredActivities[name] = details;
    });

    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  async function handleUnregister(event) {
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to unregister students.", "error");
      return;
    }

    const activity = event.currentTarget.dataset.activity;
    const email = event.currentTarget.dataset.email;
    const shouldDelete = window.confirm(
      `Are you sure you want to unregister ${email} from ${activity}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        { method: "POST" }
      );

      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      showMessage(result.message, "success");
      fetchActivities();
    } catch (error) {
      console.error("Error unregistering:", error);
      showMessage("Failed to unregister. Please try again.", "error");
    }
  }

  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", () => logout(true));
  closeLoginModal.addEventListener("click", closeLoginModalHandler);
  closeRegistrationModal.addEventListener("click", closeRegistrationModalHandler);
  manageAnnouncementsButton.addEventListener("click", openAnnouncementsModal);
  closeAnnouncementsModal.addEventListener("click", closeAnnouncementsModalHandler);
  announcementCancelEditButton.addEventListener("click", resetAnnouncementForm);
  announcementForm.addEventListener("submit", saveAnnouncement);

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }
    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }
    if (event.target === announcementsModal) {
      closeAnnouncementsModalHandler();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (!announcementsModal.classList.contains("hidden")) {
      closeAnnouncementsModalHandler();
    }
    if (!registrationModal.classList.contains("hidden")) {
      closeRegistrationModalHandler();
    }
    if (!loginModal.classList.contains("hidden")) {
      closeLoginModalHandler();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      showMessage("You must be logged in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(
          email
        )}&teacher_username=${encodeURIComponent(currentUser.username)}`,
        { method: "POST" }
      );

      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      showMessage(result.message, "success");
      closeRegistrationModalHandler();
      fetchActivities();
    } catch (error) {
      console.error("Error signing up:", error);
      showMessage("Failed to sign up. Please try again.", "error");
    }
  });

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      categoryFilters.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      dayFilters.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      timeFilters.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  window.activityFilters = {
    setDayFilter(day) {
      currentDay = day;
      dayFilters.forEach((button) => {
        button.classList.toggle("active", button.dataset.day === day);
      });
      fetchActivities();
    },
    setTimeRangeFilter(timeRange) {
      currentTimeRange = timeRange;
      timeFilters.forEach((button) => {
        button.classList.toggle("active", button.dataset.time === timeRange);
      });
      fetchActivities();
    },
  };

  checkAuthentication();
  initializeFilters();
  fetchAnnouncements();
  fetchActivities();
});
