# Inside the Moment — project brief

Imported on 15 October 2026 from the [shared project conversation](https://chatgpt.com/share/6ad0d5bf-3c78-83ed-906e-1a1c96e121b5). This is a synthesis of that conversation, not a claim that the product has been built.

Updated the same day using the authenticated [official participant brief](source/OFFICIAL_BRIEF.md). The mappings below are implementation proposals derived from that brief, not statements that the organisers have approved this concept. The first local version is now built; current implementation evidence and limitations are in [LOCAL_BUILD.md](LOCAL_BUILD.md).

On 19 October, the user authorised [Foundry Local development](FOUNDRY_LOCAL.md) without cloud spending. A native model now curates recorded statements in the desktop build. Azure cloud, voice and actual headset verification remain pending; local inference does not establish compliance with the challenge's Azure platform requirement.

## Product idea

Become the director of a football replay. Stand inside a reconstructed, fictional match moment and control time and viewpoint through voice and controller pointing. The feeling is a calm, summonable set of spatial controls rather than menus covering the action.

The first experience contains a short stream of match events and one detailed 30-second attack ending in a late goal.

Two complementary layers:

- **Relive:** stadium atmosphere, pause/rewind/slow motion, and viewpoints in the stands, dugout and on the pitch.
- **Understand:** player highlighting, passing trails and explanations tied to the synthetic event and trajectory records. Offer simple and analyst modes.

## Core demonstration

1. Watch the attack and goal.
2. Say “Freeze” or use the local controller equivalent.
3. Rewind before the decisive pass, including relative requests such as “a little further back”.
4. Point at a location, preview the destination and confirm a viewpoint move.
5. Ask why the chance developed; show the relevant players, lane and supporting evidence.
6. Clear the overlays and resume the same replay without leaving VR.

This is the end-to-end acceptance scenario. Replay controls and local AI curation are implemented on desktop; voice and Azure cloud remain pending funding. The typed command input currently stands in for voice.

## Interaction requirements

| Input | Expected behaviour |
| --- | --- |
| Freeze / play | Immediate replay state change; basic controller actions work locally. |
| Back three seconds | Seek relative to the current replay time. |
| Rewind to before the pass | Resolve an event and seek to its build-up. |
| Move me here + point | Preview a destination before committing. |
| Give me a better angle | Offer a clearer viewpoint for the selected action. |
| Show me what the keeper could see | Use the goalkeeper trajectory and communicate reconstruction limits. |
| Why was he free? | Explain supported positional evidence; highlight what the answer refers to. |
| Clear everything. Play. | Remove analysis overlays and resume. |

Combine speech with controller pointing, selected player/event, current replay time and prior request context. Highlight ambiguous references before acting.

The summonable floating strip contains a grabbable timeline, selected player details, miniature pitch, undo move and return to seat. Use brief fades for viewpoint changes. Natural head movement controls looking around.

## Proposed architecture

These choices came from the prior assistant proposal and remain subject to implementation verification.

| Layer | Direction |
| --- | --- |
| Scene | Three.js + WebXR; Quest 2 target, shared desktop viewing mode. |
| Replay | One authoritative clock driving all player and ball trajectories, overlays and audio cues. Replay state is deterministic at any timestamp. |
| Data | Seeded match events plus explicitly authored trajectories for the featured attack. Original teams, stadium and assets. |
| Input | Controllers and desktop controls first. Voice uses push-to-talk with visible transcripts when connected. Hand tracking is a later enhancement. |
| AI director | Microsoft Foundry model using a restricted, validated set of actions for event search, seek, viewpoints and evidence retrieval. |
| Explanation | Event- and trajectory-grounded answers, simple/analyst presentation and an automatic moment recap. |
| Voice | Azure Speech input/output, subject to credits and device/API validation. |
| Backend | Azure-hosted API for model calls and narration; secrets stay server-side. Deferred until funding is confirmed. |

The replay engine executes validated commands; the model does not invent player movement or directly control arbitrary application state. A request such as “rewind to just before that pass and move me where I can see the receiver” resolves the selected event, seeks its build-up and previews a suitable viewpoint.

## Decisions and open dependencies

| Item | Status |
| --- | --- |
| Continue the football experience under hackathon rules | Explicit user intent in the imported discussion. |
| Azure spending | User condition: “If i get credits with the hackathon yes”. Credit availability and entitlement are unconfirmed. |
| Working title | Inside the Moment, proposed in the source conversation. |
| Three.js/WebXR and Microsoft architecture | Three.js desktop replay and WebXR controls implemented locally; physical headset testing and Microsoft services remain pending. |
| Local foundation before cloud integration | Preserved continuation approach from the final source response. |
| Registration | Portal displays Update registration, consistent with an existing registration; details not inspected or changed. |
| Challenge, award category and submission | One challenge is available; no project has been linked or submitted by this import. Award-category choice remains open. |
| Full participant brief | Authenticated About page, expanded challenge and resource menu read and imported. See `source/OFFICIAL_BRIEF.md`. |
| Headset access and WebXR testing | Quest 2 is the target; no successful device test is recorded. |
| Code, assets, deployment | None supplied by the shared chat or present in this workspace at import. |

Do not assume Azure credits are included. The user can confirm entitlement from the registration/dashboard materials without exposing redemption codes. Any placeholder analyst must be explicitly labelled as simulated until genuine model calls are connected.

No credit offer was visible in the participant pages reviewed. The challenge describes an Azure-based solution, so the local-only milestone is not evidence of a submission-ready entry. Funding remains a dependency for the proposed Microsoft/Azure integration.

## Challenge fit and evidence

The official challenge is **The Synthetic Match Insights Engine for Premier League Studio**. Our proposed entry uses a spatial replay as the presentation layer for its match-intelligence pipeline. The final demo must show the intelligence working as well as the stadium interaction.

| Required stage | Planned implementation | Evidence to demonstrate |
| --- | --- | --- |
| Ingest | Play a timestamped synthetic event stream alongside the authored trajectories. | Events arrive in order; replay state and derived data rebuild correctly after seeking. |
| Interpret | Derive possession, passing context, player/ball motion and the key attacking pattern from records. | Explain calculations and link each metric to the event/trajectory inputs; avoid invented probability ratings. |
| Explain | AI answers why the chance opened using selected-event evidence and validated tools. | An explanation points to the relevant players, movement and events; uncertainty is explicit. |
| Render | Synchronised player highlights, passing lanes, trails and readable insight cards in VR and desktop. | Graphics track the replay clock and clear/resume correctly; desktop output communicates the same insight. |
| Personalise | Casual-fan mode uses concise everyday explanations; analyst mode adds metrics, context and evidence. | Switching modes changes depth and presentation while keeping the underlying facts consistent. |

The final scope also includes an automatic recap with wider match context, plus a demonstrable path to multilingual narration/text. The second demo language is not yet selected. Keep language selection separate from the fan/analyst detail setting and verify that translations preserve player identities, facts and timestamps.

Player tags, speed and pass-distance metrics are useful candidates for the authored attack. Video-based auto-eventing and a large multi-agent architecture are not prerequisites for the core demo; the brief presents auto-eventing as an example to consider. Do not add agents solely to match an award label.

For the equally weighted judging rubric, prepare evidence of maintainable implementation, purposeful AI actions, a useful audience scenario, clear headset/desktop interaction and an honest description of the Microsoft technologies actually connected. The specialist Foundry award may fit the proposed architecture if that integration is completed; no award selection is settled.

## Build sequence

Phase 1 is implemented and desktop-verified. Phase 2 has a controller/panel implementation awaiting actual headset testing. Local scripted equivalents cover parts of phase 4; genuine AI/voice integration and submission remain pending. The sequence below describes the full target, with implementation evidence maintained in `LOCAL_BUILD.md`.

1. **Replay foundation.** Build pitch, stadium, synthetic attack, timestamped event ingestion, derived match state, shared clock, pause/rewind/scrub and three viewpoints. Verify repeatable state and metrics after seeking and desktop operation without cloud credentials.
2. **Quest interaction.** Add controller selection, preview/confirm movement, fade transitions and timeline interaction. Verify the complete control loop on the actual Quest 2.
3. **AI direction.** Once credits are confirmed, connect speech and validated model tools, passing pointing/selection/time context. Keep local controls available during latency or service failure.
4. **Explanation.** Connect evidence-linked overlays, materially different fan/analyst modes, an automatic recap and multilingual text/narration support. Verify facts against the synthetic sequence, including translated output, and distinguish genuine model output from placeholders.
5. **Submission preparation.** Record the functioning headset experience and all five pipeline stages, prepare a roughly 110-second walkthrough, repository instructions and an accessible demo. Explain the actual Microsoft/Azure contribution and intended studio/streaming use. Publication and entry remain separate actions.

The prior proposal targeted completion on 26 October 2026 to leave room for fixes. See [the verified dates](HACKATHON.md) for the actual registration and submission deadlines.

## Deferred scope

Hand gestures, additional matches and broader personalisation can follow the single-moment demonstration. No real match footage, player tracking dataset, existing application or supplied organiser assets were recovered from the shared link. Earlier messages outside the five-message shared excerpt are unavailable here.
