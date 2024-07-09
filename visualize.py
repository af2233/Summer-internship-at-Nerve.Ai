import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL
from models.tables import Entity


def read_matrix(file_path):
    with open(file_path, "r") as file:
        matrix = []
        for line in file:
            row = []
            for val in line.strip().split():
                if val.lower() == "infinity":
                    row.append(np.inf)
                else:
                    row.append(float(val))
            matrix.append(row)
    return np.array(matrix)


def read_data_from_db():
    # Create database connection
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    data = []

    try:
        data = session.query(Entity).order_by(Entity.id).all()  # sorting by id
    finally:
        session.close()

    return data


def create_graph_from_matrix(matrix):
    G = nx.DiGraph()
    rows, cols = matrix.shape
    for i in range(rows):
        for j in range(cols):
            if (matrix[i, j] != 0) and (matrix[i, j] != np.inf):
                G.add_edge(i, j, weight=matrix[i, j])
    return G


def get_node_colors(data):
    colors = []
    for entity in data:
        if entity.isHere:
            colors.append("yellow")
        elif entity.percent is not None:
            colors.append("red" if entity.isActive else "green")
        elif entity.charged_batteries is not None:
            colors.append("blue" if entity.isActive else "orange")
        else:
            colors.append("grey")
    return colors


def visualize_graph(graph, path, pos, colors, mean_percent):
    plt.figure(figsize=(10, 7))
    nx.draw(graph, pos, node_color=colors, edge_color="gray", node_size=50, font_size=1, arrows=True, alpha=0.5)
    nx.draw_networkx_edges(path, pos, edge_color="yellow", width=2.0)
    plt.text(0.5, 0.05, f"Average Percent: {mean_percent:.2f}", ha="center", transform=plt.gcf().transFigure)
    plt.show()


# Main function
def main():
    data = read_data_from_db()

    coords = {}
    for idx, row in enumerate(data):
        coords[idx] = (row.x, row.y)

    # Filter rows where percent is not null and calculate the mean
    mean_percent = np.mean([row.percent for row in data if row.percent is not None])
    colors = get_node_colors(data)

    file_path = "matrix.txt"

    matrix = read_matrix(file_path)
    G = create_graph_from_matrix(matrix)

    file_path = "path.txt"
    matrix = read_matrix(file_path)
    H = create_graph_from_matrix(matrix)

    visualize_graph(G, H, coords, colors, mean_percent)


if __name__ == "__main__":
    main()
