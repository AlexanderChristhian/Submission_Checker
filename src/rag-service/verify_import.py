import sys
import types

# Mock external dependencies
llama_index = types.ModuleType('llama_index')
llama_index.core = types.ModuleType('llama_index.core')
llama_index.core.Document = type('Document', (), {})
sys.modules['llama_index'] = llama_index
sys.modules['llama_index.core'] = llama_index.core

# Mock app modules that may have complex dependencies
# We'll create mock modules that have the necessary attributes
# app.core.indexing
app_core_indexing = types.ModuleType('app.core.indexing')
app_core_indexing.chunk_document = lambda content, submission_id: []
app_core_indexing.chunk_llama_documents = lambda docs, submission_id: []
sys.modules['app.core.indexing'] = app_core_indexing

# app.core.embeddings
app_core_embeddings = types.ModuleType('app.core.embeddings')
app_core_embeddings.generate_embeddings = lambda texts: []
sys.modules['app.core.embeddings'] = app_core_embeddings

# app.stores.chroma_store
app_stores_chroma = types.ModuleType('app.stores.chroma_store')
app_stores_chroma.get_collection = lambda: None
sys.modules['app.stores.chroma_store'] = app_stores_chroma

# app.utils.logger
app_utils_logger = types.ModuleType('app.utils.logger')
app_utils_logger.get_logger = lambda name: None
sys.modules['app.utils.logger'] = app_utils_logger

# Now attempt import
sys.path.insert(0, '.')
try:
    from app.services.index_service import index_service
    print("SUCCESS: index_service imported")
    print(f"index_service type: {type(index_service)}")
    # Check that index_service has expected methods
    assert hasattr(index_service, 'index_file')
    assert hasattr(index_service, 'index_text')
    assert hasattr(index_service, 'delete_submission')
    print("All expected methods present")
except ImportError as e:
    print(f"FAILED: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {e}")
    sys.exit(1)