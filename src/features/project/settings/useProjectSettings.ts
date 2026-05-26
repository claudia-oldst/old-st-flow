import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Project, ProjectMember, ProjectRole, TeamMember } from "@/lib/types";
import { toast } from "sonner";
import { projectDetailsSchema } from "@/lib/schemas/project";
import { parseGithubRepoUrl } from "@/features/github/GithubRepoPrompt";
import type { ProjectLink } from "../settings/types";

export function useProjectSettings(project: Project, open: boolean, onUpdated?: (p: Project) => void) {
  const [name, setName] = useState(project.name);
  const [acronym, setAcronym] = useState(project.acronym);
  const [clientName, setClientName] = useState(project.client_name ?? "");
  const [rate, setRate] = useState<string>(String(project.rate_per_hour ?? 0));
  const [startDate, setStartDate] = useState<string>(project.start_date ?? "");
  const [links, setLinks] = useState<ProjectLink[]>(
    Array.isArray(project.links) ? (project.links as unknown as ProjectLink[]) : []
  );
  const [githubRepoUrl, setGithubRepoUrl] = useState<string>(project.github_repo_url ?? "");

  const [members, setMembers] = useState<(ProjectMember & { member: TeamMember })[]>([]);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);

  const loadMembers = async () => {
    const [{ data: pm }, { data: all }] = await Promise.all([
      supabase
        .from("project_members")
        .select("*, member:team_members(*)")
        .eq("project_id", project.id),
      supabase.from("team_members").select("*").order("name"),
    ]);
    setMembers(((pm as (ProjectMember & { member: TeamMember })[] | null) ?? []));
    setAllMembers(all ?? []);
  };

  useEffect(() => {
    if (open) {
      loadMembers();
      setName(project.name);
      setAcronym(project.acronym);
      setClientName(project.client_name ?? "");
      setRate(String(project.rate_per_hour ?? 0));
      setStartDate(project.start_date ?? "");
      setLinks(Array.isArray(project.links) ? (project.links as unknown as ProjectLink[]) : []);
      setGithubRepoUrl(project.github_repo_url ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.id]);

  const handleSaveDetails = async () => {
    const cleanedLinks = links
      .map((l) => ({ name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.url.length > 0);

    const parsed = projectDetailsSchema.safeParse({
      name,
      acronym,
      client_name: clientName,
      rate_per_hour: Number(rate),
      start_date: startDate || null,
      links: cleanedLinks,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Invalid project details");
    }

    const { data, error } = await supabase
      .from("projects")
      .update({
        name: parsed.data.name,
        acronym: parsed.data.acronym.toUpperCase(),
        client_name: parsed.data.client_name || null,
        rate_per_hour: parsed.data.rate_per_hour,
        start_date: parsed.data.start_date ?? null,
        links: parsed.data.links as unknown as Project["links"],
      })
      .eq("id", project.id)
      .select("*")
      .single();

    if (error) return toast.error(error.message);
    toast.success("Project updated");
    onUpdated?.(data as Project);
  };

  const addMember = async (userId: string, role: ProjectRole) => {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: project.id, user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Member added");
    loadMembers();
  };

  const updateMemberRole = async (userId: string, role: ProjectRole) => {
    const { error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("project_id", project.id)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    loadMembers();
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", project.id)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    loadMembers();
  };

  return {
    name, setName,
    acronym, setAcronym,
    clientName, setClientName,
    rate, setRate,
    startDate, setStartDate,
    links, setLinks,
    members, allMembers,
    handleSaveDetails, addMember, updateMemberRole, removeMember,
  };
}
