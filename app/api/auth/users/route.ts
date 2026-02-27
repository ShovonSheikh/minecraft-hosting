import { getUsers, addUser, deleteUser, updateUserRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const users = getUsers();
    return Response.json({ users });
}

export async function POST(request: Request) {
    try {
        const { username, password, role } = await request.json();
        if (!username || !password || !role) {
            return Response.json(
                { success: false, message: "Missing username, password, or role" },
                { status: 400 }
            );
        }
        const result = addUser(username, password, role);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid request" },
            { status: 400 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        if (!id) {
            return Response.json(
                { success: false, message: "Missing user id" },
                { status: 400 }
            );
        }
        const result = deleteUser(id);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid request" },
            { status: 400 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const { id, role } = await request.json();
        if (!id || !role) {
            return Response.json(
                { success: false, message: "Missing user id or role" },
                { status: 400 }
            );
        }
        const result = updateUserRole(id, role);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid request" },
            { status: 400 }
        );
    }
}
