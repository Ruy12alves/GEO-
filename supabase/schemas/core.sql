create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  website_url text not null,
  description text not null default '',
  region text not null default 'Brasil',
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_website_http check (website_url ~* '^https?://')
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index projects_org_created_idx on public.projects(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;

create policy "Members can read their organizations"
  on public.organizations for select to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id and m.user_id = (select auth.uid())
    )
  );

create policy "Authenticated users can create an organization for themselves"
  on public.organizations for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Users can read their own memberships"
  on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Organization creators can add themselves as owner"
  on public.organization_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = (select auth.uid())
    )
  );

create policy "Members can read organization projects"
  on public.projects for select to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())
    )
  );

create policy "Members can create organization projects"
  on public.projects for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())
    )
  );

create policy "Members can update organization projects"
  on public.projects for update to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())
    )
  )
  with check (
    created_by = (select auth.uid())
    and
    exists (
      select 1 from public.organization_members m
      where m.organization_id = projects.organization_id and m.user_id = (select auth.uid())
    )
  );

create policy "Organization owners and admins can delete projects"
  on public.projects for delete to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = projects.organization_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
    )
  );
