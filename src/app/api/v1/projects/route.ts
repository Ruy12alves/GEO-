import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  websiteUrl: z.url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Use um endereço HTTP ou HTTPS."),
  region: z.string().trim().min(2).max(120),
  description: z.string().max(2000).default(""),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Entre na sua conta para criar um projeto." }, { status: 401 });
  }

  let input: z.infer<typeof projectSchema>;
  try {
    input = projectSchema.parse(await request.json());
  } catch (error) {
    return Response.json({ error: "Confira os dados informados.", details: error instanceof z.ZodError ? error.issues : undefined }, { status: 400 });
  }

  const { data: existingOrganization, error: organizationLookupError } = await supabase
    .from("organizations")
    .select("id")
    .eq("created_by", user.id)
    .limit(1)
    .maybeSingle();

  if (organizationLookupError) {
    return Response.json({ error: "Não foi possível localizar seu workspace. Confirme se a migration inicial foi aplicada." }, { status: 503 });
  }

  let organizationId = existingOrganization?.id;
  if (!organizationId) {
    const { data: organization, error } = await supabase
      .from("organizations")
      .insert({ name: input.name, created_by: user.id })
      .select("id")
      .single();

    if (error || !organization) {
      return Response.json({ error: "Não foi possível criar o workspace." }, { status: 500 });
    }
    organizationId = organization.id;
  }

  const { data: membership, error: membershipLookupError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipLookupError) {
    return Response.json({ error: "Não foi possível validar o acesso ao workspace." }, { status: 500 });
  }

  if (!membership) {
    const { error } = await supabase.from("organization_members").insert({
      organization_id: organizationId,
      user_id: user.id,
      role: "owner",
    });
    if (error) {
      return Response.json({ error: "Não foi possível criar a associação ao workspace." }, { status: 500 });
    }
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: organizationId,
      name: input.name,
      website_url: input.websiteUrl,
      region: input.region,
      description: input.description,
      created_by: user.id,
    })
    .select("id, name, website_url, region, created_at")
    .single();

  if (projectError || !project) {
    return Response.json({ error: "Não foi possível salvar o projeto. Confirme se o banco local está atualizado." }, { status: 500 });
  }

  return Response.json({ project }, { status: 201 });
}
