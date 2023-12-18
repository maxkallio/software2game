from math import sqrt

from fastapi import APIRouter

from random import randint
from database import get_random_airports
from uuid import uuid4

router = APIRouter(prefix="/api")


def get_random_markers(limit=100):
    airports = get_random_airports(limit)
    markers: list[dict] = []

    for i, airport in enumerate(airports):
        price = randint(7, 32)

        markers.append({
            "id": i,
            "popup": airport[1],
            "lat": airport[2],
            "lon": airport[3],
            "title": f"Fuel price: {price}",
            "price": price
        })

    return markers


class Session:
    def __init__(self):
        self.markers = get_random_markers()
        self.visited = []

        marker = self.markers[0]

        self.plane_pos = [marker['lat'], marker['lon']]
        self.fuel = 100
        self.money = 0
        self.curr_marker = 0


sessions: dict[str, Session] = {}


@router.get("/new-session")
def get_new_session():
    session_id = str(uuid4())
    sessions[session_id] = Session()

    return {"session_id": session_id}


@router.get("/session/{session_id}/markers")
def get_session_markers(session_id):
    session = sessions.get(session_id)

    if not session:
        return False

    return session.markers


@router.get("/session/{session_id}/plane")
def get_plane_pos(session_id):
    session = sessions.get(session_id)

    if not session:
        return False

    return {"plane_pos": session.plane_pos, "marker_id": session.curr_marker}


def clamp(num, min_value, max_value):
    return max(min(num, max_value), min_value)


@router.post("/session/{session_id}/plane/{marker_id}")
def fly_to(session_id, marker_id):
    session = sessions.get(session_id)

    if not session or not marker_id.isdigit():
        return False

    if session.fuel <= 0:
        sessions.pop(session_id)

        return False

    marker_id = int(marker_id)
    marker = session.markers[marker_id]
    old_plane_pos = session.plane_pos
    session.plane_pos = [marker['lat'], marker['lon']]

    distance = int(sqrt(
        ((old_plane_pos[0] + 100) - (session.plane_pos[0] + 100)) ** 2 +
        ((old_plane_pos[1] + 100) - (session.plane_pos[1] + 100)) ** 2
    ))

    session.fuel = clamp(session.fuel - int(distance / 1.5) - 5, 0, 100)
    session.money += int(distance * 4.4)
    session.curr_marker = marker_id

    if session.curr_marker not in session.visited:
        session.visited.append(marker_id)

    if len(session.visited) >= 100:
        sessions.pop(session_id)

        return {"win": True}

    sessions[session_id] = session

    return {
        "money": session.money,
        "fuel": session.fuel
    }


@router.get("/session/{session_id}/fuel")
def buy_fuel(session_id):
    session = sessions.get(session_id)

    if not session:
        return False

    fuel_to_buy = 100 - clamp(session.fuel, 0, 100)

    if session.money >= 0:
        session.money -= fuel_to_buy * session.markers[session.curr_marker]["price"]
        session.fuel = 100

    return {
        "money": session.money,
        "fuel": session.fuel
    }
