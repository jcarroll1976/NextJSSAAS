import { ChatOpenAI } from "@langchain/openai";
import { PDFLoader} from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptsTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever} from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import pineconeClient from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { adminApp, adminDb } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";

const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model:"gpt-4o",
})

export const indexName = "papafam";

export async function generateDocs(docId: string) {
    const { userId } = await auth();

    if(!userId) {
        throw new Error("User not found");
    }

    console.log("--- Fetching the download URL from Firebase... ---");
    const firebaseRef = await adminDb
        .collection("users")
        .doc(userId)
        .collection("files")
        .doc(docId)
        .get();

    const downloadUrl = firebaseRef.data()?.downloadUrl;

    if(!downloadUrl) {
        throw new Error("Download URL not found");
    }

    console.log(`--- Download URL fetched successfully: ${downloadUrl}`);

    //Fetch the PDF from the specified URL
    const response = await fetch(downloadUrl);

    //Load the PDF into a PDFDocument object
    const data = await response.blob();

    //Load the PDF document from the specified path
    const loader = new PDFLoader(data);
    const docs = await loader.load();

    //Split the loaded document into smaller parts for easier processing
    console.log("--- Splitting the document into smaller parts... ---");
    const splitter = new RecursiveCharacterTextSplitter();

    const splitdocs = await splitter.splitDocuments(docs);
    console.log(`--- Split into ${splitdocs.length} parts ---`);

    return splitdocs;
}

async function namespaceExists(index: Index<RecordMetadata>, namespace: string) {
    if(namespace === null) throw new Error("No namespace value provided.");
    const {namespaces} = await index.describeIndexStats();
    return namespaces?.[namespace] !== undefined;
}

export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
    const { userId } = await auth();

    if(!userId) {
        throw new Error("User not found");
    }

    let pineconeVectorStore;

    //Generate embeddings (numerical representations) for the split documents
    console.log("--- Generating embeddings... ---");
    const embeddings = new OpenAIEmbeddings();

    const index = await pineconeClient.index(indexName);
    const namespaceAlreadyExists = await namespaceExists(index, docId);

    if(namespaceAlreadyExists) {
        console.log(`--- Namespace ${docId} already exists, reusing existing embeddings... ---`);

        pineconeVectorStore = await PineconeStore.fromExistingIndex(embeddings, {
            pineconeIndex: index,
            namespace: docId,
        });

        return pineconeVectorStore;
    } else {
        // If the namespace does not exist, download the PDF from firestore vua the stored Downlaod URL & generate the embeddings and store them in the Pinecone vector store
        const splitDocs = await generateDocs(docId); 
        
        console.log(`--- Storing the embeddings in namespace ${docId} in the ${indexName} Pinecone vector store... ---`);

        pineconeVectorStore = await PineconeStore.fromDocuments(
            splitDocs,
            embeddings,
            {
                pineconeIndex: index,
                namespace: docId,
            }
        );

        return pineconeVectorStore;
    }
}