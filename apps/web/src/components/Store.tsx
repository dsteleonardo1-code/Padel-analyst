"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { emptyUserState, loadState, resetExamples, saveState } from "@/lib/storage";
import type { AnalysisJob, AppState, CourtCalibration, IntensityStrip, Match, PhysicalReport, Player, Rally, Shot, UserClip, UserProfile } from "@/lib/types";

interface StoreApi {
  ready: boolean;
  state: AppState;
  setProfile: (profile: UserProfile) => void;
  upsertPlayer: (player: Player) => void;
  deletePlayer: (id: string) => void;
  upsertMatch: (match: Match, rallies: Rally[], shots: Shot[], job?: AnalysisJob) => void;
  updateShot: (shot: Shot) => void;
  addShot: (shot: Shot, rally: Rally | null) => void;
  setFocus: (matchId: string, playerId: string) => void;
  deleteMatch: (id: string) => void;
  saveToProfile: (matchId: string) => void;
  restoreExamples: () => void;
  setApiBaseUrl: (url: string) => void;
  updateJob: (job: AnalysisJob) => void;
  saveClip: (clip: UserClip) => void;
  deleteClip: (id: string) => void;
  toggleClip: (id: string) => void;
  saveCalibration: (calibration: CourtCalibration) => void;
  savePhysical: (report: PhysicalReport) => void;
  saveStrip: (strip: IntensityStrip) => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => emptyUserState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    saveState(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveState(state);
  }, [ready, state]);

  const api: StoreApi = {
    ready,
    state,
    setProfile: (profile) => setState((current) => ({ ...current, profile })),
    upsertPlayer: (player) =>
      setState((current) => ({
        ...current,
        players: [...current.players.filter((item) => item.id !== player.id), player],
      })),
    deletePlayer: (id) =>
      setState((current) => {
        const player = current.players.find((item) => item.id === id);
        if (!player || player.example) return current;
        const matchIds = new Set(current.matches.filter((match) => !match.example && match.focusPlayerId === id).map((match) => match.id));
        return {
          ...current,
          players: current.players.filter((item) => item.id !== id),
          matches: current.matches.filter((match) => !matchIds.has(match.id)),
          rallies: current.rallies.filter((rally) => !matchIds.has(rally.matchId)),
          shots: current.shots.filter((shot) => !matchIds.has(shot.matchId)),
        };
      }),
    upsertMatch: (match, rallies, shots, job) =>
      setState((current) => ({
        ...current,
        matches: [...current.matches.filter((item) => item.id !== match.id), match],
        rallies: [...current.rallies.filter((item) => item.matchId !== match.id), ...rallies],
        shots: [...current.shots.filter((item) => item.matchId !== match.id), ...shots],
        jobs: job ? [...current.jobs.filter((item) => item.id !== job.id), job] : current.jobs,
      })),
    updateShot: (shot) =>
      setState((current) => ({
        ...current,
        shots: current.shots.map((item) => (item.id === shot.id ? shot : item)),
      })),
    addShot: (shot, rally) =>
      setState((current) => ({
        ...current,
        shots: [...current.shots, shot],
        rallies: rally && !current.rallies.some((item) => item.id === rally.id) ? [...current.rallies, rally] : current.rallies,
      })),
    setFocus: (matchId, playerId) =>
      setState((current) => ({
        ...current,
        matches: current.matches.map((match) => (match.id === matchId ? { ...match, focusPlayerId: playerId } : match)),
      })),
    saveToProfile: (matchId) =>
      setState((current) => ({
        ...current,
        matches: current.matches.map((match) => (match.id === matchId ? { ...match, saved: true } : match)),
      })),
    deleteMatch: (id) =>
      setState((current) => {
        const match = current.matches.find((item) => item.id === id);
        if (!match || (match.example && !match.saved)) return current;
        return {
          ...current,
          matches: current.matches.filter((item) => item.id !== id),
          rallies: current.rallies.filter((item) => item.matchId !== id),
          shots: current.shots.filter((item) => item.matchId !== id),
          jobs: current.jobs.filter((item) => item.matchId !== id),
          clips: (current.clips ?? []).filter((item) => item.matchId !== id),
          calibrations: (current.calibrations ?? []).filter((item) => item.matchId !== id),
          physical: (current.physical ?? []).filter((item) => item.matchId !== id),
          strips: (current.strips ?? []).filter((item) => item.matchId !== id),
        };
      }),
    saveClip: (clip) =>
      setState((current) => ({ ...current, clips: [...(current.clips ?? []).filter((item) => item.id !== clip.id), clip] })),
    deleteClip: (id) => setState((current) => ({ ...current, clips: (current.clips ?? []).filter((item) => item.id !== id) })),
    toggleClip: (id) =>
      setState((current) => ({
        ...current,
        clips: (current.clips ?? []).map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
      })),
    saveCalibration: (calibration) =>
      setState((current) => ({
        ...current,
        calibrations: [...(current.calibrations ?? []).filter((item) => item.matchId !== calibration.matchId), calibration],
      })),
    savePhysical: (report) =>
      setState((current) => ({
        ...current,
        physical: [...(current.physical ?? []).filter((item) => item.matchId !== report.matchId), report],
      })),
    saveStrip: (strip) =>
      setState((current) => ({
        ...current,
        strips: [...(current.strips ?? []).filter((item) => item.matchId !== strip.matchId), strip],
      })),
    restoreExamples: () => setState((current) => resetExamples(current)),
    setApiBaseUrl: (url) => setState((current) => ({ ...current, apiBaseUrl: url })),
    updateJob: (job) =>
      setState((current) => ({
        ...current,
        jobs: [...current.jobs.filter((item) => item.id !== job.id), job],
      })),
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store mancante");
  return value;
}
