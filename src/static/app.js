document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Initialize map
  let map = null;
  let markers = {};
  let selectedActivity = null;

  function initMap() {
    // Create map centered on Mergington, MA
    map = L.map("map").setView([42.3601, -71.0589], 14);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
  }

  function addMarkersToMap(activities) {
    // Clear existing markers
    Object.values(markers).forEach((marker) => map.removeLayer(marker));
    markers = {};

    // Add marker for each activity
    Object.entries(activities).forEach(([name, details]) => {
      if (details.location && details.location.lat && details.location.lng) {
        const marker = L.marker([details.location.lat, details.location.lng])
          .addTo(map);

        const spotsLeft = details.max_participants - details.participants.length;

        // Create popup content
        const popupContent = `
          <div class="map-popup">
            <h4>${name}</h4>
            <p><strong>Location:</strong> ${details.location.room}</p>
            <p><strong>Address:</strong> ${details.location.address}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
            <p class="description">${details.description}</p>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Store marker reference
        markers[name] = marker;

        // Click handler to select activity
        marker.on("click", () => {
          selectedActivity = name;
          highlightActivity(name);
        });
      }
    });
  }

  function highlightActivity(activityName) {
    // Remove previous highlights
    document.querySelectorAll(".activity-card").forEach((card) => {
      card.classList.remove("selected");
    });

    // Highlight the selected activity card
    const cards = document.querySelectorAll(".activity-card");
    cards.forEach((card) => {
      const cardTitle = card.querySelector("h4").textContent;
      if (cardTitle === activityName) {
        card.classList.add("selected");
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    // Pan map to marker and open popup
    if (markers[activityName]) {
      const marker = markers[activityName];
      map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create location HTML
        const locationHTML = details.location
          ? `<p><strong>Location:</strong> ${details.location.room}<br>
             <span class="address">${details.location.address}</span></p>`
          : "";

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          ${locationHTML}
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        // Click handler to select activity and show on map
        activityCard.addEventListener("click", (e) => {
          // Don't trigger if clicking delete button
          if (!e.target.classList.contains("delete-btn")) {
            highlightActivity(name);
          }
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Add markers to map
      addMarkersToMap(activities);
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  initMap();
  fetchActivities();
});
