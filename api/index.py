import sys
import os

# Add root directory and backend directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app import app

# Vercel WSGI entry point
if __name__ == "__main__":
    app.run()
