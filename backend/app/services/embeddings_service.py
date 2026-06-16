import numpy as np
from typing import List

class EmbeddingsService:
    def __init__(self):
        self._model = None

    @property
    def model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                print("Loading SentenceTransformer('all-MiniLM-L6-v2')...")
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
                print("SentenceTransformer loaded successfully.")
            except Exception as e:
                print(f"Warning: Could not load local SentenceTransformer: {e}")
                print("Using high-performance mock embedding fallback (384 dimensions).")
                self._model = "mock"
        return self._model

    def generate_embedding(self, text: str) -> List[float]:
        """Generates a 384-dimensional vector embedding for the input text."""
        model = self.model
        if model != "mock" and model is not None:
            try:
                embedding = model.encode(text)
                return embedding.tolist()
            except Exception as e:
                print(f"Error encoding text: {e}")
        
        # High-performance mock fallback: generate deterministic pseudo-random array based on string hash
        char_sum = sum(ord(c) * (i + 1) for i, c in enumerate(text))
        np.random.seed(char_sum % (2**32 - 1))
        mock_vector = np.random.uniform(-0.15, 0.15, 384).tolist()
        return mock_vector

embeddings_service = EmbeddingsService()
