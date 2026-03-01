from app import db


def test_create_and_read_user(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()

    assert db.create_user("alice", "hash123") is True
    assert db.create_user("alice", "hash123") is False
    assert db.get_user_password("alice") == "hash123"


def test_save_messages(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()
    db.save_message("alice", "hello")
    db.save_message("alice", "private", "bob")

    msgs = list(db.last_messages())
    assert len(msgs) == 2
    assert msgs[0]["body"] == "hello"
    assert msgs[1]["receiver"] == "bob"
