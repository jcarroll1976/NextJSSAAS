'use server';

import { auth } from "@clerk/nextjs/server";

export async function generateEmbeddings(docId: string) {
    auth.protect() // Protect this route with Clerk

    // Turn the PDF into embeddings [0.01234,0.234234...]
    await generateEmbeddingsInPineconeVectorStore(docId);
}