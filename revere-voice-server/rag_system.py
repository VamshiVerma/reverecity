# RAG System for Revere City Dashboard
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from dataclasses import dataclass
import pickle
import hashlib

# Vector database and ML imports
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("ChromaDB not available. Install with: pip install chromadb")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("SentenceTransformers not available. Install with: pip install sentence-transformers")

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Document:
    """Represents a document in the RAG system"""
    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    timestamp: Optional[datetime] = None

class RevereRAGSystem:
    """
    Retrieval-Augmented Generation system for Revere City data
    Stores documents, generates embeddings, and provides semantic search
    """

    def __init__(self,
                 collection_name: str = "revere_documents",
                 persist_directory: str = "./revere_rag_db",
                 embedding_model: str = "all-MiniLM-L6-v2"):
        """
        Initialize the RAG system with vector database and embedding model

        Args:
            collection_name: Name of the ChromaDB collection
            persist_directory: Directory to persist the vector database
            embedding_model: Name of the sentence transformer model
        """
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.embedding_model_name = embedding_model

        # Initialize components
        self._initialize_embedding_model()
        self._initialize_vector_db()
        self._initialize_knowledge_base()

        logger.info(f"🎯 RAG System initialized with collection: {collection_name}")

    def _initialize_embedding_model(self):
        """Initialize the embedding model for semantic search"""
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer(self.embedding_model_name)
                logger.info(f"✅ Loaded embedding model: {self.embedding_model_name}")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                self.embedding_model = None
        else:
            logger.warning("Sentence transformers not available, using simple embeddings")
            self.embedding_model = None

    def _initialize_vector_db(self):
        """Initialize ChromaDB for vector storage"""
        if CHROMADB_AVAILABLE:
            try:
                # Create ChromaDB client with persistence
                self.chroma_client = chromadb.PersistentClient(path=self.persist_directory)

                # Get or create collection
                self.collection = self.chroma_client.get_or_create_collection(
                    name=self.collection_name,
                    metadata={"description": "Revere City knowledge base"}
                )

                logger.info(f"✅ Vector database initialized: {self.collection.count()} documents")
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB: {e}")
                self.collection = None
        else:
            logger.warning("ChromaDB not available, using in-memory storage")
            self.collection = None
            self.memory_store = []  # Fallback to simple list storage

    def _initialize_knowledge_base(self):
        """Load initial Revere-specific knowledge"""
        initial_documents = [
            {
                "content": """Revere is a city in Suffolk County, Massachusetts, United States,
                located approximately 5 miles from downtown Boston. Known for Revere Beach,
                America's first public beach, established in 1896. The city has a population
                of approximately 62,186 as of the 2020 census.""",
                "metadata": {
                    "source": "city_overview",
                    "category": "general",
                    "date": "2024"
                }
            },
            {
                "content": """Revere Beach is a public beach in Revere, Massachusetts,
                located about 5 miles north of downtown Boston. Founded in 1896, it is
                America's first public beach. The beach is over 3 miles long and is
                easily accessible by the MBTA Blue Line.""",
                "metadata": {
                    "source": "attractions",
                    "category": "tourism",
                    "date": "2024"
                }
            },
            {
                "content": """The MBTA Blue Line serves Revere with stations at Wonderland,
                Revere Beach, Beachmont, and Suffolk Downs. The Blue Line provides direct
                service to downtown Boston, with connections to other subway lines at
                Government Center and State Street.""",
                "metadata": {
                    "source": "transportation",
                    "category": "transit",
                    "date": "2024"
                }
            },
            {
                "content": """Revere City Hall is located at 281 Broadway, Revere, MA 02151.
                Phone: (781) 286-8100. Office hours are Monday-Friday, 8:00 AM - 4:30 PM.
                The city provides various services including permits, licenses, tax payments,
                and public records.""",
                "metadata": {
                    "source": "city_services",
                    "category": "government",
                    "date": "2024"
                }
            },
            {
                "content": """Revere Public Schools serves approximately 7,800 students
                across 11 schools. The district includes Revere High School, three middle
                schools, and seven elementary schools. The school system is known for its
                diversity and multilingual programs.""",
                "metadata": {
                    "source": "education",
                    "category": "schools",
                    "date": "2024"
                }
            },
            {
                "content": """Major development projects in Revere include the redevelopment
                of Suffolk Downs, which will create a new mixed-use neighborhood with housing,
                retail, and office space. The Wonderland redevelopment is another significant
                project aimed at revitalizing the area around the transit station.""",
                "metadata": {
                    "source": "development",
                    "category": "planning",
                    "date": "2024"
                }
            }
        ]

        # Add initial documents to the knowledge base
        for doc_data in initial_documents:
            doc_id = self._generate_doc_id(doc_data["content"])
            if not self._document_exists(doc_id):
                self.add_document(
                    content=doc_data["content"],
                    metadata=doc_data["metadata"]
                )

        logger.info(f"📚 Knowledge base initialized with {len(initial_documents)} documents")

    def _generate_doc_id(self, content: str) -> str:
        """Generate a unique ID for a document based on its content"""
        return hashlib.md5(content.encode()).hexdigest()

    def _document_exists(self, doc_id: str) -> bool:
        """Check if a document already exists in the collection"""
        if self.collection:
            try:
                result = self.collection.get(ids=[doc_id])
                return len(result['ids']) > 0
            except:
                return False
        return False

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text

        Args:
            text: Text to embed

        Returns:
            Embedding vector as list of floats
        """
        if self.embedding_model:
            try:
                # Generate embedding using sentence transformer
                embedding = self.embedding_model.encode(text, convert_to_numpy=True)
                return embedding.tolist()
            except Exception as e:
                logger.error(f"Failed to generate embedding: {e}")

        # Fallback: Simple hash-based embedding
        return self._simple_embedding(text)

    def _simple_embedding(self, text: str, dim: int = 384) -> List[float]:
        """Generate a simple deterministic embedding for fallback"""
        # Create a deterministic pseudo-random embedding
        np.random.seed(hash(text) % (2**32))
        return np.random.randn(dim).tolist()

    def add_document(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Add a document to the RAG system

        Args:
            content: Document content
            metadata: Optional metadata dictionary

        Returns:
            Document ID
        """
        doc_id = self._generate_doc_id(content)

        # Add timestamp to metadata
        if metadata is None:
            metadata = {}
        metadata['added_at'] = datetime.now().isoformat()
        metadata['char_count'] = len(content)

        # Generate embedding
        embedding = self.generate_embedding(content)

        # Store in vector database
        if self.collection:
            try:
                self.collection.add(
                    embeddings=[embedding],
                    documents=[content],
                    metadatas=[metadata],
                    ids=[doc_id]
                )
                logger.info(f"✅ Added document {doc_id[:8]}... to vector database")
            except Exception as e:
                logger.error(f"Failed to add document to ChromaDB: {e}")
        else:
            # Fallback to memory storage
            self.memory_store.append({
                'id': doc_id,
                'content': content,
                'metadata': metadata,
                'embedding': embedding
            })
            logger.info(f"✅ Added document {doc_id[:8]}... to memory storage")

        return doc_id

    def search(self, query: str, k: int = 5, filter_metadata: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Search for relevant documents using semantic similarity

        Args:
            query: Search query
            k: Number of results to return
            filter_metadata: Optional metadata filters

        Returns:
            List of relevant documents with scores
        """
        # Generate query embedding
        query_embedding = self.generate_embedding(query)

        results = []

        if self.collection:
            try:
                # Search in ChromaDB
                search_results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=k,
                    where=filter_metadata if filter_metadata else None
                )

                # Format results
                for i in range(len(search_results['ids'][0])):
                    results.append({
                        'id': search_results['ids'][0][i],
                        'content': search_results['documents'][0][i],
                        'metadata': search_results['metadatas'][0][i],
                        'distance': search_results['distances'][0][i] if 'distances' in search_results else 0
                    })

                logger.info(f"🔍 Found {len(results)} relevant documents for query: {query[:50]}...")
            except Exception as e:
                logger.error(f"Search failed in ChromaDB: {e}")
        else:
            # Fallback: Simple cosine similarity search in memory
            if self.memory_store:
                for doc in self.memory_store:
                    score = self._cosine_similarity(query_embedding, doc['embedding'])
                    results.append({
                        'id': doc['id'],
                        'content': doc['content'],
                        'metadata': doc['metadata'],
                        'distance': 1 - score  # Convert similarity to distance
                    })

                # Sort by distance and return top k
                results.sort(key=lambda x: x['distance'])
                results = results[:k]

        return results

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)

        dot_product = np.dot(vec1, vec2)
        norm_vec1 = np.linalg.norm(vec1)
        norm_vec2 = np.linalg.norm(vec2)

        if norm_vec1 == 0 or norm_vec2 == 0:
            return 0

        return dot_product / (norm_vec1 * norm_vec2)

    def generate_answer(self, query: str, context_docs: List[Dict[str, Any]],
                       use_llm: bool = False) -> str:
        """
        Generate an answer using retrieved documents

        Args:
            query: User question
            context_docs: Retrieved relevant documents
            use_llm: Whether to use an LLM for generation

        Returns:
            Generated answer
        """
        if not context_docs:
            return "I don't have enough information to answer your question about Revere."

        # Combine context from retrieved documents
        context = "\n\n".join([doc['content'] for doc in context_docs[:3]])

        if use_llm and OPENAI_AVAILABLE:
            # Use OpenAI for generation (requires API key)
            try:
                response = self._generate_with_llm(query, context)
                return response
            except Exception as e:
                logger.error(f"LLM generation failed: {e}")

        # Fallback: Template-based response
        return self._generate_template_response(query, context, context_docs)

    def _generate_template_response(self, query: str, context: str,
                                   docs: List[Dict[str, Any]]) -> str:
        """Generate a template-based response without LLM"""
        response = f"Based on the Revere City knowledge base:\n\n"

        # Add relevant information from top documents
        for i, doc in enumerate(docs[:2], 1):
            response += f"{i}. {doc['content'][:200]}...\n\n"

        # Add metadata information
        sources = list(set([doc['metadata'].get('source', 'unknown') for doc in docs[:3]]))
        if sources:
            response += f"Sources: {', '.join(sources)}"

        return response

    def ask(self, question: str, use_llm: bool = False) -> Dict[str, Any]:
        """
        Main Q&A interface - search for relevant docs and generate answer

        Args:
            question: User's question
            use_llm: Whether to use LLM for answer generation

        Returns:
            Dictionary with answer and metadata
        """
        logger.info(f"❓ Processing question: {question}")

        # Search for relevant documents
        relevant_docs = self.search(question, k=5)

        # Generate answer
        answer = self.generate_answer(question, relevant_docs, use_llm)

        return {
            'question': question,
            'answer': answer,
            'sources': relevant_docs,
            'timestamp': datetime.now().isoformat(),
            'method': 'rag_retrieval'
        }

    def add_pdf(self, pdf_path: str) -> List[str]:
        """Add a PDF document to the knowledge base"""
        try:
            import PyPDF2
            doc_ids = []

            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)

                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    if text.strip():
                        doc_id = self.add_document(
                            content=text,
                            metadata={
                                'source': os.path.basename(pdf_path),
                                'page': page_num + 1,
                                'type': 'pdf'
                            }
                        )
                        doc_ids.append(doc_id)

            logger.info(f"📄 Added PDF with {len(doc_ids)} pages: {pdf_path}")
            return doc_ids
        except Exception as e:
            logger.error(f"Failed to add PDF: {e}")
            return []

    def add_text_file(self, file_path: str) -> str:
        """Add a text file to the knowledge base"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

            doc_id = self.add_document(
                content=content,
                metadata={
                    'source': os.path.basename(file_path),
                    'type': 'text'
                }
            )

            logger.info(f"📝 Added text file: {file_path}")
            return doc_id
        except Exception as e:
            logger.error(f"Failed to add text file: {e}")
            return ""

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about the RAG system"""
        stats = {
            'total_documents': 0,
            'collection_name': self.collection_name,
            'embedding_model': self.embedding_model_name,
            'vector_db': 'ChromaDB' if self.collection else 'Memory',
            'categories': {}
        }

        if self.collection:
            try:
                stats['total_documents'] = self.collection.count()

                # Get all documents to analyze categories
                all_docs = self.collection.get()
                for metadata in all_docs['metadatas']:
                    category = metadata.get('category', 'uncategorized')
                    stats['categories'][category] = stats['categories'].get(category, 0) + 1
            except:
                pass
        else:
            stats['total_documents'] = len(self.memory_store)
            for doc in self.memory_store:
                category = doc['metadata'].get('category', 'uncategorized')
                stats['categories'][category] = stats['categories'].get(category, 0) + 1

        return stats


# Example usage and testing
if __name__ == "__main__":
    # Initialize RAG system
    rag = RevereRAGSystem()

    # Get system statistics
    stats = rag.get_statistics()
    print(f"\n📊 RAG System Statistics:")
    print(f"Total Documents: {stats['total_documents']}")
    print(f"Categories: {stats['categories']}")

    # Test Q&A
    test_questions = [
        "What is Revere Beach?",
        "How do I get to Revere by public transit?",
        "What are the City Hall hours?",
        "Tell me about schools in Revere"
    ]

    print("\n🧪 Testing Q&A System:")
    for question in test_questions:
        result = rag.ask(question)
        print(f"\nQ: {question}")
        print(f"A: {result['answer'][:200]}...")
        print(f"Sources: {len(result['sources'])} documents found")