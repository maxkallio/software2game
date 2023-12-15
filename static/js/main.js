var map = L.map('map').fitWorld();
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var posMap = new Map();
var markersMap = new Map();
var currFuel = 100;
var currMoney = 0;
var sessionId = "";
var currMarkerId = 0;

document.addEventListener("DOMContentLoaded", function () {
    var fuelPrice = document.querySelector('.fuel-price');
    var money = document.querySelector('.money');
    var name = document.querySelector('.name');
    var fuel = document.querySelector('.fuel');
    var input = document.querySelector('.login-input');
    var button = document.querySelector('.login-button');
    var buttonBuy = document.querySelector('.buy-button');
    var login = document.querySelector('.login');
    var winMenu = document.querySelector('.win-menu');
    var loginMenu = document.querySelector('.login-menu');

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
        var inputText = input.value;
        if (inputText == '') inputText = 'Stranger';

        name.innerText = `🧑‍✈️Name: ${inputText}`;
        login.style.display = 'none';
        loginMenu.style.display = 'none';
    });

    async function buyFuel() {
        const fuelResponse = await(await fetch(`/api/session/${sessionId}/fuel`)).json();

        setFuel(fuelResponse["fuel"]);
        setMoney(fuelResponse["money"]);
    }

    buttonBuy.addEventListener('click', function () {
        buyFuel();
    });

    var planeIcon = L.icon({
        iconUrl: "/static/image/plane.webp",
        iconSize: [48, 48],
    });

    var plane = L.marker(
        [0, 0],
        {
            icon: planeIcon,
            zIndexOffset: 1000000
        }
    ).addTo(map);

    async function updatePlanePos() {
        const planeResponse = await(await fetch(`/api/session/${sessionId}/plane`)).json();
        var planePos = planeResponse["plane_pos"];
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
        var markersData = await markersResponse.json();

        await updatePlanePos();

        for (let i = 0; i < 100; i++) {
            var marker = markersData[i];
            var mapMarker = L.marker(
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

            var fuelPrice = marker['price'];
            posMap.set(mapMarker.getLatLng().toString(), marker['id']);
            markersMap.set(marker['id'], marker);

            mapMarker.on("click", function(ev) {
                if (currFuel <= 0) {
                    alert("Game over! Your fuel is out!");

                    return;
                };

                var planePos = map.latLngToLayerPoint(plane.getLatLng());
                var markerPos = map.latLngToLayerPoint(ev.latlng);
                var eventMarkerId = posMap.get(ev.latlng.toString());
                var eventMarker = markersMap.get(eventMarkerId);

                var fx = new L.PosAnimation();

                fx.once('end', function() {
                    flyTo(eventMarkerId);
                    updatePlanePos();
                    setFuelPrice(eventMarker["price"], eventMarker["popup"]);
                });

                planePos.x = markerPos.x;
                planePos.y = markerPos.y;

                fx.run(plane._icon, planePos, 0.8);
            });
        };
    };

    startGame().then((state) => {});
});
