import numpy as np
import sqlalchemy as db
from sqlalchemy.orm import sessionmaker
from sqlalchemy import and_
from scipy.spatial import distance


from models.tables import Entity, Charger
from config import DATABASE_URL

# Database connection and session creation
def create_session():
    engine = db.create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    return Session()


# Database query functions
def read_data_from_db(session):
    return session.query(Entity).order_by(Entity.id).all()  # sorting by id


def get_start_vertex(session):
    return session.query(Entity).filter_by(isHere=True).first()


def get_home_vertex(session):
    return session.query(Entity).filter(and_(Entity.x == 0, Entity.y == 0)).first()


def get_active_vehicles(session):
    return (
        session.query(Entity)
        .filter(
            and_(
                Entity.isActive == True, Entity.percent != None, Entity.isHere == False
            )
        )
        .all()
    )


def get_active_charging_stations(session):
    return (
        session.query(Entity)
        .filter(
            and_(
                Entity.isActive == True,
                Entity.charged_batteries != None,
                Entity.isHere == False,
            )
        )
        .all()
    )


def get_empty_charging_station(session):
    return (
        session.query(Entity)
        .filter(
            and_(
                Entity.isActive == False,
                Entity.charged_batteries == 0,
                Entity.discharged_batteries == 0,
                Entity.isHere == False,
            )
        )
        .first()
    )


def get_charger(session):
    return session.query(Charger).first()


# Helper functions
def calculate_mean_percent(data):
    return np.mean([row.percent for row in data if row.percent is not None])


def find_closest_vertex(start_Entity, active_vertices):
    start_point = (start_Entity.x, start_Entity.y)
    closest_Entity = None
    min_distance = float("inf")

    for Entity in active_vertices:
        end_point = (Entity.x, Entity.y)
        dist = distance.euclidean(start_point, end_point)
        if dist < min_distance:
            min_distance = dist
            closest_Entity = Entity

    return closest_Entity


def read_matrix(filename):
    with open(filename, "r") as file:
        lines = file.readlines()
        matrix = []
        for line in lines:
            matrix.append(
                [float(x) if x != "Infinity" else float("inf") for x in line.split()]
            )
    return np.array(matrix)


def dijkstra(matrix, start_Entity):
    n = len(matrix)
    visited = [False] * n
    distance = [float("inf")] * n
    distance[start_Entity] = 0
    predecessors = [-1] * n

    for _ in range(n):
        min_distance = float("inf")
        min_Entity = -1
        for Entity in range(n):
            if not visited[Entity] and distance[Entity] < min_distance:
                min_distance = distance[Entity]
                min_Entity = Entity

        visited[min_Entity] = True

        for Entity in range(n):
            if (
                matrix[min_Entity][Entity] > 0
                and not visited[Entity]
                and distance[Entity] > distance[min_Entity] + matrix[min_Entity][Entity]
            ):
                distance[Entity] = distance[min_Entity] + matrix[min_Entity][Entity]
                predecessors[Entity] = min_Entity

    return distance, predecessors


def get_path(predecessors, end_Entity):
    path = []
    while end_Entity != -1:
        path.insert(0, end_Entity)
        end_Entity = predecessors[end_Entity]
    return path


def create_path(matrix, start_Entity, end_Entity):
    n = len(matrix)
    distance, predecessors = dijkstra(matrix, start_Entity)
    path = get_path(predecessors, end_Entity)

    shortest_path_matrix = np.full((n, n), float("inf"))

    for i in range(len(path) - 1):
        u = path[i]
        v = path[i + 1]
        shortest_path_matrix[u][v] = matrix[u][v]

    return shortest_path_matrix


def write_matrix(filename, matrix):
    with open(filename, "w") as file:
        for row in matrix:
            file.write(
                " ".join(["Infinity" if x == float("inf") else str(x) for x in row])
                + "\n"
            )


# Updating funtions
def update_vehicle_data(session, start_vertex, end_vertex):
    end_vertex.percent = 100
    end_vertex.isActive = False
    end_vertex.isHere = True
    start_vertex.isHere = False
    session.commit()


def update_charging_station_data(session, start_vertex, end_vertex, ch_bat, disch_bat):
    end_vertex.charged_batteries = ch_bat
    end_vertex.discharged_batteries = disch_bat
    end_vertex.isActive = False
    end_vertex.isHere = True
    start_vertex.isHere = False
    session.commit()


def update_vertex_data(session, start_vertex, end_vertex):
    end_vertex.isHere = True
    start_vertex.isHere = False
    session.commit()



# Script functions
def closest_vehicle_search(session, file_names):

    # Get start Entity
    start_vertex = get_start_vertex(session)

    # Get active vertices
    active_vehicles = get_active_vehicles(session)
    
    if not active_vehicles:
        return start_vertex, False
    else:
        end_vertex = find_closest_vertex(start_vertex, active_vehicles)

    # Get indices for start and end vertices
    start_index = start_vertex.id - 1  # Assuming IDs start from 1
    end_index = end_vertex.id - 1

    # Read the adjacency matrix from file
    matrix = read_matrix(file_names['in'])

    # Create the shortest path matrix
    shortest_path_matrix = create_path(matrix, start_index, end_index)

    # Write the result to the output file
    write_matrix(file_names['out'], shortest_path_matrix)

    # Update the data in the database
    update_vehicle_data(session, start_vertex, end_vertex)
    return start_vertex, end_vertex


def closest_charging_station_search(session, file_names):

    # Get start Entity
    start_vertex = get_start_vertex(session)

    # Get active charging stations
    active_charging_stations = get_active_charging_stations(session)
    
    if not active_charging_stations:
        return start_vertex, False
    else:
        end_vertex = find_closest_vertex(start_vertex, active_charging_stations)

    # Read the adjacency matrix from file
    matrix = read_matrix(file_names['in'])

    # Get indices for start and end vertices
    start_index = start_vertex.id - 1  # Assuming IDs start from 1
    end_index = end_vertex.id - 1

    # Create the shortest path matrix
    shortest_path_matrix = create_path(matrix, start_index, end_index)

    # Write the result to the output file
    write_matrix(file_names['out'], shortest_path_matrix)

    # Update the data in the database
    return start_vertex, end_vertex


def empty_charging_station_search(session, file_names):

    # Get start Entity
    start_vertex = get_start_vertex(session)

    # Get empty station
    empty_charging_station = get_empty_charging_station(session)
    
    if not empty_charging_station:
        return start_vertex, False
    else:
        end_vertex = empty_charging_station

    # Read the adjacency matrix from file
    matrix = read_matrix(file_names['in'])

    # Get indices for start and end vertices
    start_index = start_vertex.id - 1  # Assuming IDs start from 1
    end_index = end_vertex.id - 1

    # Create the shortest path matrix
    shortest_path_matrix = create_path(matrix, start_index, end_index)

    # Write the result to the output file
    write_matrix(file_names['out'], shortest_path_matrix)

    # Update the data in the database
    return start_vertex, end_vertex


def heading_home(session, file_names):

    # Get start Entity
    start_vertex = get_start_vertex(session)

    home_vertex = get_home_vertex(session)
    
    if not home_vertex:
        return start_vertex, False
    else:
        end_vertex = home_vertex

    # Read the adjacency matrix from file
    matrix = read_matrix(file_names['in'])

    # Get indices for start and end vertices
    start_index = start_vertex.id - 1  # Assuming IDs start from 1
    end_index = end_vertex.id - 1

    # Create the shortest path matrix
    shortest_path_matrix = create_path(matrix, start_index, end_index)

    # Write the result to the output file
    write_matrix(file_names['out'], shortest_path_matrix)

    # Update the data in the database
    update_vertex_data(session, start_vertex, end_vertex)
    return start_vertex, end_vertex


# Main processing functions
def process_low_mean_percent(session, mean_percent, charger, file_names):
    if charger.charged_batteries > 0:
        print(f"{mean_percent} %\t|\tvehicle search")

        start_vertex, end_vertex = closest_vehicle_search(session, file_names)
        
        if end_vertex != False:
            # Updating charger
            charger.x = end_vertex.x
            charger.y = end_vertex.y
            charger.charged_batteries -= 1
            charger.discharged_batteries += 1
            session.commit()
        else:
            return

    elif charger.discharged_batteries == 10:
        print(f"{mean_percent} %\t|\tfinding charging station")
        
        start_vertex, end_vertex = closest_charging_station_search(session, file_names)
    
        if end_vertex != False:
            update_charging_station_data(session, start_vertex, end_vertex, charger.charged_batteries, charger.discharged_batteries)
        
            # Updating charger
            charger.x = end_vertex.x
            charger.y = end_vertex.y
            charger.charged_batteries = 10
            charger.discharged_batteries = 0
            session.commit()
        else:
            return

    else:
        print(f"{mean_percent} %\t|\tmissing batteries")
    
        start_vertex, end_vertex = closest_charging_station_search(session, file_names)

        if end_vertex != False:
            update_charging_station_data(session, start_vertex, end_vertex, charger.charged_batteries, charger.discharged_batteries)

            # Updating charger
            charger.x = end_vertex.x
            charger.y = end_vertex.y
            charger.charged_batteries = 10
            charger.discharged_batteries = 0
            session.commit()
        else:
            return



def process_high_mean_percent(session, mean_percent, charger, file_names):
    print(f"{mean_percent} %\t|\twork is done")

    start_vertex, end_vertex = empty_charging_station_search(session, file_names)

    if end_vertex != False:
        update_charging_station_data(session, start_vertex, end_vertex, charger.charged_batteries, charger.discharged_batteries)

        # Updating charger
        charger.x = end_vertex.x
        charger.y = end_vertex.y
        charger.charged_batteries = 0
        charger.discharged_batteries = 0
        session.commit()

        # final function
        print(f"{mean_percent} %\t|\theading home")
        start_vertex, end_vertex = heading_home(session, file_names)
        charger.x = end_vertex.x
        charger.y = end_vertex.y
        session.commit()
    else:
        return


def main():
    session = create_session()
    file_names = {"in": "matrix.txt", "out": "path.txt"}

    data = read_data_from_db(session)
    charger = get_charger(session)
    mean_percent = calculate_mean_percent(data)

    if mean_percent < 80:
        process_low_mean_percent(session, mean_percent, charger, file_names)
    else:
        if (charger.x == 0) and (charger.y == 0):
            return
        else:
            process_high_mean_percent(session, mean_percent, charger, file_names)
            print("Program finished.")
        
    session.close()
    return


if __name__ == "__main__":
    main()
