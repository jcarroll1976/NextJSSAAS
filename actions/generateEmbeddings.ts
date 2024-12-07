'use server';

import { generateEmbeddingsInPineconeVectorStore } from "@/lib/langchain";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function generateEmbeddings(docId: string) {
    auth.protect() // Protect this route with Clerk

    // Turn the PDF into embeddings [0.01234,0.234234...]
    await generateEmbeddingsInPineconeVectorStore(docId);

    revalidatePath("/dashboard"); // Revalidate the dashboard page

    return {completed: true};
}