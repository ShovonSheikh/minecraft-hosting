import { getProperties, setProperties } from "@/lib/mc-server";

export const dynamic = "force-dynamic";

export async function GET() {
    const properties = getProperties();
    return Response.json({ properties });
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { properties } = body;

        if (!properties || typeof properties !== "object") {
            return Response.json(
                { success: false, message: "Missing 'properties' object in request body" },
                { status: 400 }
            );
        }

        const result = setProperties(properties);
        return Response.json(result, { status: result.success ? 200 : 400 });
    } catch {
        return Response.json(
            { success: false, message: "Invalid JSON body" },
            { status: 400 }
        );
    }
}
