from contextlib import contextmanager
from sqlite3 import connect, Cursor

connection = connect('database.db', check_same_thread=False)


@contextmanager
def get_cursor() -> Cursor:
    cursor = connection.cursor()
    try:
        yield cursor
    finally:
        cursor.close()


def create_database():
    cursor: Cursor

    with (
        get_cursor() as cursor,
        open("./sql/airport_init.sql", encoding="utf-8-sig") as init_file
    ):
        cursor.executescript(init_file.read())
        connection.commit()


def get_random_airports(limit: int) -> tuple:
    cursor: Cursor

    with get_cursor() as cursor:
        cursor.execute(
            "SELECT id, name, latitude_deg, longitude_deg FROM airport ORDER BY RANDOM() LIMIT ?",
            (limit, )
        )
        return tuple(cursor.fetchall())
