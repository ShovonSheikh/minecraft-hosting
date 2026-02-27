import { getSchedules, addSchedule, deleteSchedule, toggleSchedule } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
    const schedules = getSchedules();
    return Response.json({ schedules });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = addSchedule(body);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return Response.json({ success: false, message: "Missing id" }, { status: 400 });
        const result = deleteSchedule(id);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}

export async function PUT(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) return Response.json({ success: false, message: "Missing id" }, { status: 400 });
        const result = toggleSchedule(id);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json({ success: false, message: "Invalid request" }, { status: 400 });
    }
}
