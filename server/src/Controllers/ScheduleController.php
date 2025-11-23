<?php

class ScheduleController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    private function getUserIdFromToken() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) return null;
        
        $token = str_replace('Bearer ', '', $headers['Authorization']);
        
        $stmt = $this->pdo->prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        return $session ? $session['user_id'] : null;
    }

    public function save() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['schedule'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Schedule data required']);
            return;
        }

        $scheduleJson = json_encode($data['schedule']);

        $stmt = $this->pdo->prepare("SELECT id FROM user_schedules WHERE user_id = ?");
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $stmt = $this->pdo->prepare("UPDATE user_schedules SET schedule_json = ? WHERE user_id = ?");
            $stmt->execute([$scheduleJson, $userId]);
        } else {
            $stmt = $this->pdo->prepare("INSERT INTO user_schedules (user_id, schedule_json) VALUES (?, ?)");
            $stmt->execute([$userId, $scheduleJson]);
        }

        echo json_encode(['message' => 'Schedule saved successfully']);
    }

    public function get() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT schedule_json FROM user_schedules WHERE user_id = ?");
        $stmt->execute([$userId]);
        $result = $stmt->fetch();

        if ($result) {
            echo json_encode(['schedule' => json_decode($result['schedule_json'], true)]);
        } else {
            echo json_encode(['schedule' => null]);
        }
    }

    public function generatePlan() {
        $userId = $this->getUserIdFromToken();
        if (!$userId) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT group_id, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user['group_id']) {
            http_response_code(400);
            echo json_encode(['error' => 'User not in a group']);
            return;
        }

        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Only admins can generate the plan']);
            return;
        }

        $stmt = $this->pdo->prepare("SELECT id, name FROM users WHERE group_id = ?");
        $stmt->execute([$user['group_id']]);
        $members = $stmt->fetchAll();

        if (count($members) < 2) {
            http_response_code(400);
            echo json_encode(['error' => 'Need at least 2 members']);
            return;
        }

        $memberIds = array_column($members, 'id');
        $placeholders = implode(',', array_fill(0, count($memberIds), '?'));
        $stmt = $this->pdo->prepare("SELECT user_id, schedule_json FROM user_schedules WHERE user_id IN ($placeholders)");
        $stmt->execute($memberIds);
        $schedules = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        if (count($schedules) < count($members)) {
            http_response_code(400);
            echo json_encode(['error' => 'Not all members have completed their schedules']);
            return;
        }

        $parsedSchedules = [];
        foreach ($schedules as $uid => $json) {
            $parsedSchedules[$uid] = json_decode($json, true);
        }

        $plan = $this->calculateOptimalPlan($members, $parsedSchedules);

        foreach ($plan as $dayIndex => $dayPlan) {
            $morning = json_encode($dayPlan['morning']);
            $night = json_encode($dayPlan['night']);
            $passengerM = $dayPlan['passenger_m'];
            $passengerN = $dayPlan['passenger_n'];

            $stmt = $this->pdo->prepare("SELECT id FROM roster WHERE group_id = ? AND day_index = ?");
            $stmt->execute([$user['group_id'], $dayIndex]);
            $existing = $stmt->fetch();

            if ($existing) {
                $stmt = $this->pdo->prepare("UPDATE roster SET morning = ?, night = ?, passenger_m = ?, passenger_n = ? WHERE group_id = ? AND day_index = ?");
                $stmt->execute([$morning, $night, $passengerM, $passengerN, $user['group_id'], $dayIndex]);
            } else {
                $stmt = $this->pdo->prepare("INSERT INTO roster (group_id, day_index, morning, night, passenger_m, passenger_n) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$user['group_id'], $dayIndex, $morning, $night, $passengerM, $passengerN]);
            }
        }

        echo json_encode(['message' => 'Plan generated successfully', 'plan' => $plan]);
    }

    private function calculateOptimalPlan($members, $schedules) {
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $plan = [];
        
        // Track total shifts per person for fair rotation
        $totalShifts = [];
        foreach ($members as $member) {
            $totalShifts[$member['name']] = 0;
        }

        foreach ($days as $dayIndex => $dayName) {
            // Step 1: Gather daily info for each person
            $peopleInfo = [];
            foreach ($members as $member) {
                $userId = $member['id'];
                $userName = $member['name'];
                $daySchedule = $schedules[$userId][$dayName] ?? null;

                $isOff = !$daySchedule || !empty($daySchedule['off']);
                $start = !$isOff && !empty($daySchedule['start']) ? $daySchedule['start'] : null;
                $end = !$isOff && !empty($daySchedule['end']) ? $daySchedule['end'] : null;
                $hours = ($start && $end) ? (strtotime($end) - strtotime($start)) / 3600 : 0;

                $peopleInfo[] = [
                    'name' => $userName,
                    'leaveAt' => $start,
                    'leaveAtTimestamp' => $start ? strtotime($start) : null,
                    'classEnd' => $end,
                    'isOff' => $isOff,
                    'classHours' => $hours,
                    'shifts' => $totalShifts[$userName]
                ];
            }

            // Step 2: Find the "Alarm Clock" person (earliest leave time)
            $earliestLeaveTimestamp = null;
            foreach ($peopleInfo as $person) {
                if (!$person['isOff'] && $person['leaveAtTimestamp']) {
                    if ($earliestLeaveTimestamp === null || $person['leaveAtTimestamp'] < $earliestLeaveTimestamp) {
                        $earliestLeaveTimestamp = $person['leaveAtTimestamp'];
                    }
                }
            }

            // Step 3: Identify available morning workers
            $morningCandidates = [];
            $allPassengers = [];
            $PREP_TIME_SECONDS = 2 * 3600; // 2 hours

            if ($earliestLeaveTimestamp === null) { // Everyone has the day off
                $morningCandidates = $peopleInfo;
            } else {
                foreach ($peopleInfo as $person) {
                    if ($person['isOff']) {
                        // Person with day off is always a candidate
                        $morningCandidates[] = $person;
                    } elseif ($person['leaveAtTimestamp']) {
                        $buffer = $person['leaveAtTimestamp'] - $earliestLeaveTimestamp;
                        if ($buffer >= $PREP_TIME_SECONDS) {
                            $morningCandidates[] = $person;
                        } else {
                            $allPassengers[] = $person['name'];
                        }
                    } else {
                        // Should not happen if not off, but handle as passenger
                        $allPassengers[] = $person['name'];
                    }
                }
            }

            // Step 4: Assign morning workers from candidates (flexible count)
            usort($morningCandidates, fn($a, $b) => $a['shifts'] <=> $b['shifts']); // Fairness rotation

            $morningWorkers = [];
            $morningWorkerNames = [];
            $numWorkersToAssign = min(count($morningCandidates), 2);

            for ($i = 0; $i < $numWorkersToAssign; $i++) {
                $worker = $morningCandidates[$i];
                $morningWorkers[] = ['n' => $worker['name'], 't' => $worker['isOff'] ? 'Day Off' : 'Before Class'];
                $morningWorkerNames[] = $worker['name'];
                $totalShifts[$worker['name']]++;
            }

            // Everyone else is a passenger
            foreach ($peopleInfo as $person) {
                if (!in_array($person['name'], $morningWorkerNames)) {
                    $allPassengers[] = $person['name'];
                }
            }
            $morningPassengerStr = implode(' & ', array_unique($allPassengers));

            // Step 5: Assign Night Shift (based on fairness)
            $nightCandidates = [];
            // Everyone who was a passenger in the morning is a candidate for night shift
            foreach ($peopleInfo as $person) {
                if (in_array($person['name'], $allPassengers)) {
                    $nightCandidates[] = $person;
                }
            }

            // If not enough passengers, add morning workers with fewer class hours
            if (count($nightCandidates) < 2) {
                $morningWorkersInfo = [];
                foreach($peopleInfo as $p) {
                    if(in_array($p['name'], $morningWorkerNames)) $morningWorkersInfo[] = $p;
                }
                usort($morningWorkersInfo, fn($a, $b) => $a['classHours'] <=> $b['classHours']);
                $nightCandidates = array_merge($nightCandidates, $morningWorkersInfo);
            }

            // Sort night candidates by fairness (shifts worked)
            usort($nightCandidates, fn($a, $b) => $a['shifts'] <=> $b['shifts']);

            $nightWorkers = [];
            $nightWorkerNames = [];
            $numNightWorkers = min(count($nightCandidates), 2);

            for ($i = 0; $i < $numNightWorkers; $i++) {
                $worker = $nightCandidates[$i];
                $nightWorkers[] = ['n' => $worker['name'], 't' => $worker['isOff'] ? 'Free' : 'After Class'];
                $nightWorkerNames[] = $worker['name'];
                $totalShifts[$worker['name']]++;
            }

            // Final passenger is whoever is not working at night
            $nightPassengerStr = 'None';
            foreach ($peopleInfo as $person) {
                if (!in_array($person['name'], $nightWorkerNames)) {
                    $nightPassengerStr = $person['name'];
                    break;
                }
            }

            $plan[$dayIndex] = [
                'morning' => $morningWorkers,
                'night' => $nightWorkers,
                'passenger_m' => $morningPassengerStr,
                'passenger_n' => $nightPassengerStr
            ];
        }

        return $plan;
    }
}
