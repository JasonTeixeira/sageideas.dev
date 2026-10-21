import sqlite3
import sys


FIXTURE_START = "-- academy-public-fixture:start"
FIXTURE_END = "-- academy-public-fixture:end"


def deny_dangerous(opcode, _arg1, _arg2, _database, _trigger):
    denied = {
        sqlite3.SQLITE_ATTACH,
        sqlite3.SQLITE_DETACH,
    }
    return sqlite3.SQLITE_DENY if opcode in denied else sqlite3.SQLITE_OK


def statements(source):
    buffer = ""
    for character in source:
        buffer += character
        if character == ";" and sqlite3.complete_statement(buffer):
            if buffer.strip():
                yield buffer
            buffer = ""
    if buffer.strip():
        raise ValueError("incomplete SQL statement")


def strip_public_fixture(source):
    start = source.find(FIXTURE_START)
    end = source.find(FIXTURE_END)
    if start == -1 and end == -1:
        return source
    if start == -1 or end == -1 or end < start:
        raise ValueError("invalid public fixture markers")
    return source[:start] + source[end + len(FIXTURE_END):]


def execute(connection, source, emit_results):
    for statement in statements(source):
        cursor = connection.execute(statement)
        if emit_results and cursor.description:
            print(" | ".join(column[0] for column in cursor.description))
            for row in cursor.fetchall():
                print(" | ".join("" if value is None else str(value) for value in row))


def main():
    if len(sys.argv) != 2:
        raise SystemExit(2)
    source = open(sys.argv[1], "r", encoding="utf-8").read()
    private_setup = sys.stdin.read()
    if len(private_setup.encode("utf-8")) > 8_192:
        raise ValueError("private SQL fixture exceeds input limit")
    connection = sqlite3.connect(":memory:")
    connection.enable_load_extension(False)
    connection.set_authorizer(deny_dangerous)
    connection.set_progress_handler(lambda: 0, 10_000)
    connection.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 65_536)
    connection.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, 1_048_576)
    if private_setup.strip():
        execute(connection, private_setup, False)
        source = strip_public_fixture(source)
    execute(connection, source, True)


if __name__ == "__main__":
    main()
