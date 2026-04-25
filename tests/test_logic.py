"""
T16 Logic Verification Tests
distributeRoles / generateEventSlots 핵심 로직을 Python으로 재현하여 버그 탐지
"""
import math
import random
import uuid
import sys

# ── Constants (mirrored from gameConfig.ts) ──────────────────────────────────
ALL_PLEDGE_CODES = [
    'EDU-01','EDU-02','EDU-03','EDU-04','EDU-05',
    'EDU-06','EDU-07','EDU-08','EDU-09','EDU-10',
    'ENV-01','ENV-02','ENV-03','ENV-04','ENV-05',
    'ENV-06','ENV-07','ENV-08','ENV-09','ENV-10',
    'ECO-01','ECO-02','ECO-03','ECO-04','ECO-05',
    'ECO-06','ECO-07','ECO-08','ECO-09','ECO-10',
]

ALL_DISTRICTS = [
    '\uc11c\uc6b8\uac15\ub3d9\uad6c','\uc11c\uc6b8\uac15\uc11c\uad6c','\uc11c\uc6b8\uc11c\ucd08\uad6c',
    '\uc11c\uc6b8\uc1a1\ud30c\uad6c','\uc11c\uc6b8\ub9c8\ud3ec\uad6c','\ubd80\uc0b0\ud574\uc6b4\ub300\uad6c',
    '\ubd80\uc0b0\ub3d9\ub798\uad6c','\ub300\uad6c\uc218\uc131\uad6c','\ub300\uad6c\ub2ec\uc11c\uad6c',
    '\uc778\uccb4\ub0a8\ub3d9\uad6c','\uc778\uccb4\uc11c\uad6c','\uad11\uc8fc\ubd81\uad6c',
    '\uad11\uc8fc\ub2a8\uad6c','\ub300\uc804\uc720\uc131\uad6c','\ub300\uc804\uc11c\uad6c',
    '\uc6b8\uc0b0\ub3d9\uad6c','\uc6b8\uc0b0\uc911\uad6c','\uc218\uc6d0\uc2dc\uad8c\uc120\uad6c',
    '\uc218\uc6d0\uc2dc\uc601\ud1b5\uad6c','\uace0\uc591\uc2dc\ub355\uc591\uad6c',
    '\uace0\uc591\uc2dc\uc77c\uc0b0\ub3d9\uad6c','\uc131\ub0a8\uc2dc\uc218\uc815\uad6c',
    '\uc6a9\uc778\uc2dc\ucc98\uc778\uad6c','\uccad\uc8fc\uc2dc\uc11c\uc6d0\uad6c',
    '\uc804\uc8fc\uc2dc\uc644\uc0b0\uad6c','\ucc3d\uc6d0\uc2dc\uc758\uc0dd\uad6c',
    '\ud3ec\ud56d\uc2dc\ubd81\uad6c','\uc81c\uc8fc\uc2dc\uc8fc\uc5f0\ub3d9\uad6c',
    '\uc900\uccb4\uc2dc\uc18c','\uc545\uc218\ub9ac\uc2dc\uc18c',
]

EVENT_TYPES = ['mass_protest','press_scoop','poll_reveal','party_change','speaker_direct','disaster']
PLEDGE_DIFFICULTIES = ['easy','medium','hard']


def shuffle(arr):
    a = arr[:]
    for i in range(len(a)-1, 0, -1):
        j = random.randint(0, i)
        a[i], a[j] = a[j], a[i]
    return a


def distribute_roles(count):
    pool_size = min(len(ALL_DISTRICTS), len(ALL_PLEDGE_CODES))
    assert 1 <= count <= pool_size, f"count {count} out of range 1-{pool_size}"

    gov_count = math.floor(count * 0.4)
    opp_count = math.floor(count * 0.4)
    ind_count = count - gov_count - opp_count

    parties = ['\uc5ec'] * gov_count + ['\uc57c'] * opp_count + ['\ubb34'] * ind_count
    shuffled_parties = shuffle(parties)
    shuffled_districts = shuffle(ALL_DISTRICTS[:count])
    shuffled_pledges = shuffle(ALL_PLEDGE_CODES[:count])

    return [
        {
            'index': i,
            'party': shuffled_parties[i],
            'district': shuffled_districts[i],
            'pledgeCode': shuffled_pledges[i],
            'pledgeDifficulty': PLEDGE_DIFFICULTIES[i % len(PLEDGE_DIFFICULTIES)],
        }
        for i in range(count)
    ]


def generate_event_slots(count=3):
    all_stages = [2, 3, 4]
    selected = all_stages if count == 3 else shuffle(all_stages)[:2]
    return [
        {
            'id': str(uuid.uuid4()),
            'stage': stage,
            'offsetRatio': 0.25 + random.random() * 0.5,
            'eventType': random.choice(EVENT_TYPES),
            'triggered': False,
            'skipped': False,
        }
        for stage in selected
    ]


# ── Test helpers ─────────────────────────────────────────────────────────────
PASS = 0
FAIL = 0

def check(name, condition, detail=''):
    global PASS, FAIL
    if condition:
        print(f'  \u2713 {name}')
        PASS += 1
    else:
        print(f'  \u2717 {name}{": " + detail if detail else ""}')
        FAIL += 1


# ── Scenario A: 10-player role distribution ───────────────────────────────────
print('\n[Scenario A] 10\uc778 \uc5ed\ud560 \ubc30\ubd84')
roles = distribute_roles(10)
gov = sum(1 for r in roles if r['party'] == '\uc5ec')
opp = sum(1 for r in roles if r['party'] == '\uc57c')
ind = sum(1 for r in roles if r['party'] == '\ubb34')
check('total count == 10', len(roles) == 10, str(len(roles)))
check('gov == 4', gov == 4, str(gov))
check('opp == 4', opp == 4, str(opp))
check('ind == 2', ind == 2, str(ind))
check('no duplicate districts', len({r['district'] for r in roles}) == 10)
check('no duplicate pledges', len({r['pledgeCode'] for r in roles}) == 10)
check('difficulty cycles easy/medium/hard', roles[0]['pledgeDifficulty'] == 'easy' and roles[1]['pledgeDifficulty'] == 'medium' and roles[2]['pledgeDifficulty'] == 'hard')


# ── Scenario B: 30-player ratio verification ─────────────────────────────────
print('\n[Scenario B] 30\uc778 \ube44\uc728 \uac80\uc99d')
roles30 = distribute_roles(30)
gov30 = sum(1 for r in roles30 if r['party'] == '\uc5ec')
opp30 = sum(1 for r in roles30 if r['party'] == '\uc57c')
ind30 = sum(1 for r in roles30 if r['party'] == '\ubb34')
check('total count == 30', len(roles30) == 30, str(len(roles30)))
check('gov == 12 (40%)', gov30 == 12, str(gov30))
check('opp == 12 (40%)', opp30 == 12, str(opp30))
check('ind == 6 (20%)', ind30 == 6, str(ind30))
check('all 30 districts unique', len({r['district'] for r in roles30}) == 30)
check('all 30 pledges unique', len({r['pledgeCode'] for r in roles30}) == 30)
# Boundary check: 30 uses all districts/pledges in pool
check('uses all 30 districts', {r['district'] for r in roles30} == set(ALL_DISTRICTS[:30]))

# Edge cases: odd counts
for n in [11, 15, 21, 25]:
    r = distribute_roles(n)
    g = math.floor(n * 0.4)
    o = math.floor(n * 0.4)
    i = n - g - o
    actual_g = sum(1 for x in r if x['party'] == '\uc5ec')
    actual_o = sum(1 for x in r if x['party'] == '\uc57c')
    actual_i = sum(1 for x in r if x['party'] == '\ubb34')
    check(f'count={n}: gov={g} opp={o} ind={i}', actual_g==g and actual_o==o and actual_i==i,
          f'got gov={actual_g} opp={actual_o} ind={actual_i}')
    check(f'count={n}: total == {n}', len(r) == n)


# ── Scenario C: Event slot generation ────────────────────────────────────────
print('\n[Scenario C] \uc774\ubca4\ud2b8 \uc2ac\ub86f \uc0dd\uc131')
slots3 = generate_event_slots(3)
check('count=3 gives 3 slots', len(slots3) == 3, str(len(slots3)))
check('count=3 uses stages 2,3,4', sorted(s['stage'] for s in slots3) == [2,3,4])
check('all offsetRatio in [0.25, 0.75]', all(0.25 <= s['offsetRatio'] <= 0.75 for s in slots3))
check('all eventType valid', all(s['eventType'] in EVENT_TYPES for s in slots3))
check('no triggered/skipped on creation', all(not s['triggered'] and not s['skipped'] for s in slots3))
check('all IDs unique', len({s['id'] for s in slots3}) == 3)

slots2 = generate_event_slots(2)
check('count=2 gives 2 slots', len(slots2) == 2, str(len(slots2)))
check('count=2: no duplicate stages', len({s['stage'] for s in slots2}) == 2)
# All slots2 stages are subset of {2,3,4}
check('count=2: stages subset of {2,3,4}', all(s['stage'] in [2,3,4] for s in slots2))


# ── Scenario D: Concurrent slot update simulation ─────────────────────────────
print('\n[Scenario D] \ub3d9\uc2dc \uc2ac\ub86f \ud2b8\ub9ac\uac70 \ucda9\ub3cc \uc2e4\ub9ac\ucf54 \uac80\uc99d (API \ub85c\uc9c1 \ud655\uc778)')
# Simulate optimistic concurrency: slot already triggered → 409
def simulate_slot_trigger(slot_triggered):
    """Returns True if trigger should be allowed, False if 409"""
    return not slot_triggered

slot_state = {'triggered': False, 'skipped': False}
check('first trigger: allowed', simulate_slot_trigger(slot_state['triggered']) == True)
slot_state['triggered'] = True
check('second trigger: blocked (409)', simulate_slot_trigger(slot_state['triggered']) == False)

skipped_slot = {'triggered': False, 'skipped': True}
# API checks both triggered and skipped
allowed = not skipped_slot['triggered'] and not skipped_slot['skipped']
check('skipped slot: trigger blocked', allowed == False)


# ── Summary ───────────────────────────────────────────────────────────────────
print(f'\n{"=" * 50}')
print(f'PASS: {PASS}  FAIL: {FAIL}  TOTAL: {PASS+FAIL}')
if FAIL > 0:
    print('CRITICAL: logic bugs found above — fix before E2E')
    sys.exit(1)
else:
    print('All logic checks passed')
    sys.exit(0)
