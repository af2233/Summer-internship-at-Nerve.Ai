import sqlalchemy as db
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Entity(Base):
    __tablename__ = "entities"
    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    percent = db.Column(db.Float)
    charged_batteries = db.Column(db.Integer)
    discharged_batteries = db.Column(db.Integer)
    isActive = db.Column(db.Boolean)
    isHere = db.Column(db.Boolean)


class Charger(Base):
    __tablename__ = "charger"
    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    charged_batteries = db.Column(db.Integer)
    discharged_batteries = db.Column(db.Integer)
