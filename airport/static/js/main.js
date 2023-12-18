let map = L.map('map').fitWorld();
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let posMap = new Map();
let markersMap = new Map();
let currFuel = 100;
let currMoney = 0;
let sessionId = "";
let currMarkerId = 0;
let currMarkerTarget;

document.addEventListener("DOMContentLoaded", function () {
    let fuelPrice = document.querySelector('.fuel-price');
    let money = document.querySelector('.money');
    let name = document.querySelector('.name');
    let fuel = document.querySelector('.fuel');
    let input = document.querySelector('.login-input');
    let button = document.querySelector('.login-button');
    let buttonBuy = document.querySelector('.buy-button');
    let login = document.querySelector('.login');
    let winMenu = document.querySelector('.win-menu');
    let loginMenu = document.querySelector('.login-menu');

    function setFuel(fuels) {
        currFuel = fuels;
        fuel.innerText = `🔥Fuel: ${fuels}/100`;
    };

    function setMoney(moneyValue) {
        currMoney = moneyValue;
        money.innerText = `💰Money: ${moneyValue}$`;
    };

    function setFuelPrice(price, airport) {
        fuelPrice.innerText = `Fuel price in ${airport}: ${price}$ per unit`;
    };

    function showWinMenu() {
        login.style.display = 'flex';
        winMenu.style.display = 'flex';
    };

    button.addEventListener('click', function () {
        let inputText = input.value;
        if (inputText == '') inputText = 'Stranger';

        name.innerText = `🧑‍✈️Name: ${inputText}`;
        login.style.display = 'none';
        loginMenu.style.display = 'none';
    });

    async function hideCurrMarker() {

    };

    async function buyFuel() {
        if (!currMarkerTarget) {
            return;
        }

        const fuelResponse = await(await fetch(`/api/session/${sessionId}/fuel`)).json();

        prevFuel = currFuel;

        setFuel(fuelResponse["fuel"]);
        setMoney(fuelResponse["money"]);

        if (prevFuel != currFuel) {
            currMarkerTarget.remove();
        };
    }

    buttonBuy.addEventListener('click', function () {
        buyFuel();
    });

    let planeIcon = L.icon({
        iconUrl: "/static/image/plane.webp",
        iconSize: [48, 48],
    });

    let plane = L.marker(
        [0, 0],
        {
            icon: planeIcon,
            zIndexOffset: 1000000
        }
    ).addTo(map);

    async function updatePlanePos() {
        const planeResponse = await(await fetch(`/api/session/${sessionId}/plane`)).json();
        let planePos = planeResponse["plane_pos"];
        plane.setLatLng([planePos[0], planePos[1]]);
    };

    async function flyTo(toMarkerId) {
        const planeResponse = await(await fetch(`/api/session/${sessionId}/plane/${toMarkerId}`, {method: "POST"})).json();

        if (!planeResponse) {
            setFuel(0);
            return;
        };

        setFuel(planeResponse["fuel"]);
        setMoney(planeResponse["money"]);

        currMarkerId = toMarkerId;

        if (planeResponse["win"]) {
            showWinMenu();
        };
    };

    async function startGame() {
        const sessionResponse = await (await fetch(`/api/new-session`)).json();

        if (!sessionResponse) {
            currFuel = 0;
        };

        setFuel(currFuel);

        sessionId = sessionResponse["session_id"];

        const markersResponse = await fetch(`/api/session/${sessionId}/markers`);
        let markersData = await markersResponse.json();

        await updatePlanePos();

        for (let i = 0; i < 100; i++) {
            let marker = markersData[i];
            let mapMarker = L.marker(
                [
                    marker['lat'], marker['lon']
                ],
                {
                    riseOnHover: true,
                    title: marker['title'],
                    zIndexOffset: marker['id']
                }
            );
            mapMarker.addTo(map).bindPopup(marker['popup']);

            let fuelPrice = marker['price'];
            posMap.set(mapMarker.getLatLng().toString(), marker['id']);
            markersMap.set(marker['id'], marker);

            mapMarker.on("click", function(ev) {
                if (currFuel <= 0) {
                    alert("Game over! Your fuel is out!");

                    return;
                };

                let planePos = map.latLngToLayerPoint(plane.getLatLng());
                let markerPos = map.latLngToLayerPoint(ev.latlng);
                let eventMarkerId = posMap.get(ev.latlng.toString());
                let eventMarker = markersMap.get(eventMarkerId);

                let fx = new L.PosAnimation();

                fx.once('end', function() {
                    flyTo(eventMarkerId);
                    updatePlanePos();
                    setFuelPrice(eventMarker["price"], eventMarker["popup"]);
                    ev.target.setOpacity(0.4);
                    currMarkerTarget = ev.target;
                });

                planePos.x = markerPos.x;
                planePos.y = markerPos.y;

                fx.run(plane._icon, planePos, 0.8);
            });
        };
    };

    startGame().then((state) => {});
});
