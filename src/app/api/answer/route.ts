import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('audio') as File;
        const questionId = formData.get('questionId') as string;

        if (!file || !questionId) {
            return NextResponse.json({ error: 'Missing audio or questionId' }, { status: 400 });
        }

        // 1. Save Audio File Locally
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure uploads dir exists
        const uploadDir = join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });

        const fileName = `audio-${session.id}-${Date.now()}.webm`;
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        const audioUrl = `/uploads/${fileName}`;

        // 2. Transcribe Audio (Simulated for this demo environment)
        // Real implementation would call OpenAI Whisper or local Python script here.
        // e.g. const transcript = await transcribe(filePath);

        // Simulate latency and result based on file size/mock logic
        let transcript = "Simulated: Farmer shared crop details.";
        // Mocking logic to make demo feel vaguely real
        if (Math.random() > 0.5) transcript = "Simulated: I expect 500kg yield next month.";
        else transcript = "Simulated: Yes, I use organic fertilizers only.";

        // 3. Save Answer to DB
        const answer = await prisma.answer.create({
            data: {
                transcript,
                audioUrl,
                questionId,
                userId: session.id as string
            }
        });

        return NextResponse.json({ success: true, answer });

    } catch (error) {
        console.error('Answer upload error:', error);
        return NextResponse.json({ error: 'Failed to process answer' }, { status: 500 });
    }
}
