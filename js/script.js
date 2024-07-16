const teams = [];
let selectedTeams = [];

function addTeam() {
  const teamName = document.getElementById("teamName").value;
  const teamColor = document.getElementById("teamColor").value;

  if (teamName) {
    const team = { name: teamName, color: teamColor, cups: 6, points: 0 };
    teams.push(team);
    displayTeams();
    document.getElementById("teamForm").reset();
  }
}

function displayTeams() {
  const list = document.getElementById("teamList");
  list.innerHTML = "";
  teams.forEach((team, index) => {
    const col = document.createElement("div");
    col.className = "col mb-4 mb-md-2";

    const card = document.createElement("div");
    card.className = "d-flex align-items-center bg-light rounded-4 p-3 h-100";
    card.style.color = team.color;

    const label = document.createElement("label");
    label.className = "d-flex align-items-center";
    label.style.width = "100%";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "teamSelection";
    checkbox.className = "form-check-input"
    checkbox.value = index;
    checkbox.onchange = handleTeamSelection;

    const teamInfo = document.createElement("div");
    teamInfo.className = "ms-3";
    teamInfo.innerHTML = `<strong>${team.name}</strong><br>Punkte: ${team.points}`;

    label.appendChild(checkbox);
    label.appendChild(teamInfo);
    card.appendChild(label);
    col.appendChild(card);
    list.appendChild(col);
  });
}

function clearTeams() {
  teams.length = 0;
  displayTeams();
}

function handleTeamSelection() {
  selectedTeams = [];
  const selections = document.querySelectorAll('input[name="teamSelection"]:checked');
  selections.forEach((input) => {
    selectedTeams.push(teams[input.value]);
  });

  document.getElementById("matchButton").disabled = selectedTeams.length !== 2;
}

function prepareMatch() {
  if (selectedTeams.length === 2) {
    const matchInfo = document.getElementById("matchInfo");
    matchInfo.innerHTML =
      generateMatchHTML(selectedTeams[0], 0) +
      " vs " +
      generateMatchHTML(selectedTeams[1], 1);
    document.getElementById("endMatchButton").classList.remove("hidden");
    document.getElementById("gameSection").style.display = "block"; // Show the game section

    // Send the team colors to the ESP32 and start the match
    sendColorsToESP32(selectedTeams[0].color, selectedTeams[1].color);
    startMatchOnESP32();
  }
}

function startMatchOnESP32() {
  const url = "http://192.168.70.234/"; // ESP32 IP address
  const data = {
    command: "startMatch"
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => response.text())
    .then(data => {
      console.log('Success:', data);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function sendColorsToESP32(color1, color2) {
  const url = "http://192.168.70.234/"; // ESP32 IP address
  const data = {
    team1Color: hexToRgb(color1),
    team2Color: hexToRgb(color2)
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => response.text())
    .then(data => {
      console.log('Success:', data);
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function generateMatchHTML(team, index) {
  return `<div class="team-info">${team.name} <span class="team-color" style="color:${team.color}">●</span> 
            (<button class="small" onclick="changeCups(${index}, -1)">-</button> 
            <span id="cups${index}">${team.cups}</span> Becher 
            <button class="small" onclick="changeCups(${index}, 1)">+</button>)</div>`;
}

function changeCups(teamIndex, delta) {
  const team = selectedTeams[teamIndex];
  if (team.cups + delta >= 0 && team.cups + delta <= 6) {
    team.cups += delta;
    document.getElementById(`cups${teamIndex}`).textContent = team.cups;
  }
}

function endMatch() {
  if (selectedTeams[0].cups > selectedTeams[1].cups) {
    teams[teams.indexOf(selectedTeams[0])].points++;
  } else if (selectedTeams[0].cups < selectedTeams[1].cups) {
    teams[teams.indexOf(selectedTeams[1])].points++;
  }
  selectedTeams.forEach((team) => (team.cups = 6));
  displayTeams();
  document.getElementById("matchInfo").innerHTML = "";
  document.getElementById("endMatchButton").classList.add("hidden");
  document.getElementById("gameSection").style.display = "none"; // Hide the game section
}

function handleButtonPressNotification() {
  if (selectedTeams.length === 2) {
    changeCups(0, -1);
    changeCups(1, -1);
  }
}

function checkButtonStatus() {
  const url = "http://192.168.70.234/button-status"; // ESP32 IP address

  fetch(url)
    .then(response => response.text())
    .then(status => {
      if (status === "pressed") {
        handleButtonPressNotification();
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

setInterval(checkButtonStatus, 1000); // Check every second

document.addEventListener("DOMContentLoaded", () => {
  checkButtonStatus();
});
