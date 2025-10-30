<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Laravel\Sanctum\PersonalAccessToken;

class ConversationController extends Controller
{
    public function create(Request $request)
    {
        $user_ids = $request->input('user_ids');

        // Ensure it's an array
        if (!is_array($user_ids)) {
            $user_ids = [$user_ids];
            $request->merge(['user_ids' => $user_ids]);
        }

        $request->validate([
            'user_ids'   => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id'
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'User is not logged in.'
            ], 401);
        }

        $allUserIds = array_unique(array_merge([$user->id], $user_ids));

        if (count($allUserIds) === 2) {
            $existingConversation = Conversation::where('type', 'single')
                ->whereHas('participants', function ($q) use ($allUserIds) {
                    $q->whereIn('user_id', $allUserIds);
                }, '=', count($allUserIds))
                ->whereHas('participants', function ($q) use ($allUserIds) {
                    $q->whereNotIn('user_id', $allUserIds);
                }, '=', 0)
                ->first();

            if ($existingConversation) {
                return response()->json([
                    'success' => true,
                    'message' => 'Existing conversation found',
                    'conversation' => $existingConversation->load('participants.user', 'chats')
                ]);
            }
        }

        $conversation = Conversation::create([
            'type' => count($allUserIds) > 2 ? 'group' : 'single',
            'name' => $request->name ?? ''
        ]);

        foreach ($allUserIds as $id) {
            $conversation->participants()->create([
                'user_id' => $id
            ]);
        }

        if ($conversation->type === 'group') {
            $conversation->chats()->create([
                'sender_id' => $user->id,
                'message'   => 'created this group'
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Conversation created',
            'conversation' => $conversation->load('participants.user', 'chats')
        ]);
    }

    public function fetch(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'User is not logged in.'
            ], 401);
        }

        $allChats = [];
        $allParticipants = [];

        $allConversations = $user->conversations()->get();

        foreach ($allConversations as $conversation) {
            $chat = Chat::where('conversation_id', $conversation->id)->get()->map(function ($chat) {
                return [
                    'id' => $chat->client_id,
                    'conversation_id' => $chat->conversation_id,
                    'sender_id' => $chat->sender_id,
                    'message' => $chat->message,
                    'message_type'=> $chat->message_type,
                    'created_at' => $chat->created_at,
                    'updated_at' => $chat->updated_at,
                ];
            });

            $participants = ConversationParticipant::with('user')->where('conversation_id', $conversation->id)->get();

            $allChats = array_merge($allChats, $chat->toArray());
            $allParticipants = array_merge($allParticipants, $participants->toArray());
        }

        return response()->json([
            'success' => true,
            'conversations' => $allConversations,
            'chats' => $allChats,
            'participants' => $allParticipants
        ]);
    }

    public function liveChat(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            echo "event: error\n";
            echo 'data: ' . json_encode(['message' => 'Missing token']) . "\n\n";
            flush();
            return;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            echo "event: error\n";
            echo 'data: ' . json_encode(['message' => 'Invalid token']) . "\n\n";
            flush();
            return;
        }

        $user = $accessToken->tokenable;
        $userId = $user->id;
        $lastUpdatedAt = $request->query('last_updated_at');

        Log::info("Live Chat SSE connected: user {$userId}");

        return new StreamedResponse(function () use ($userId, $lastUpdatedAt) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');

            ignore_user_abort(true); // Allow loop to detect client disconnect
            set_time_limit(0);       // Prevent PHP timeout

            $pdo = DB::connection()->getPdo();
            $startTime = time(); // Used to limit runtime

            while (true) {
                // Stop if client closed or 10 minutes passed
                if (connection_aborted() || (time() - $startTime > 900)) {
                    Log::info("Live Chat SSE disconnected: user {$userId}");
                    DB::disconnect();
                    break;
                }

                try {
                    $allChats = [];

                    $convStmt = $pdo->prepare("SELECT DISTINCT conversation_id FROM conversation_participants WHERE user_id = ?");
                    $convStmt->execute([$userId]);
                    $conversationIds = $convStmt->fetchAll(\PDO::FETCH_COLUMN);

                    if (!empty($conversationIds)) {
                        $placeholders = implode(',', array_fill(0, count($conversationIds), '?'));
                        $query = "
                            SELECT client_id AS id, conversation_id, sender_id, message, message_type, created_at, updated_at
                            FROM chats
                            WHERE conversation_id IN ($placeholders)
                        ";
                        $params = $conversationIds;

                        if ($lastUpdatedAt) {
                            $query .= " AND updated_at > ?";
                            $params[] = $lastUpdatedAt;
                        }

                        $query .= " ORDER BY created_at ASC";
                        $stmt = $pdo->prepare($query);
                        $stmt->execute($params);

                        while ($chat = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                            $allChats[] = $chat;
                            $lastUpdatedAt = $chat['updated_at'];
                        }
                    }

                    if (!empty($allChats)) {
                        echo 'data: ' . json_encode($allChats) . "\n\n";
                        ob_flush();
                        flush();
                    } else {
                        echo "event: heartbeat\n";
                        echo "data: {}\n\n";
                        @ob_flush();
                        @flush();
                    }

                    sleep(2);
                } catch (\Throwable $e) {
                    echo "event: error\n";
                    echo 'data: ' . json_encode(['message' => $e->getMessage()]) . "\n\n";
                    ob_flush();
                    flush();
                    sleep(2);
                }
            }
        });
    }


    public function liveStories(Request $request)
    {
        $token = $request->query('token');

        if (!$token) {
            echo "event: error\n";
            echo 'data: ' . json_encode(['message' => 'Missing token']) . "\n\n";
            flush();
            return;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            echo "event: error\n";
            echo 'data: ' . json_encode(['message' => 'Invalid token']) . "\n\n";
            flush();
            return;
        }

        $user = $accessToken->tokenable;
        $userId = $user->id;
        $lastUpdatedAt = $request->query('last_updated_at');

        Log::info("Live Stories SSE connected: user {$userId}");

        return new StreamedResponse(function () use ($userId, $lastUpdatedAt) {
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');

            ignore_user_abort(true); // Allow loop to continue until browser closes
            set_time_limit(0);       // Prevent script timeout

            $pdo = DB::connection()->getPdo();
            $startTime = time(); // Runtime limiter (optional safety net)

            while (true) {
                if (connection_aborted() || (time() - $startTime > 30)) {
                    Log::info("Live Stories SSE disconnected: user {$userId}");
                    DB::disconnect();
                    break;
                }

                try {
                    $allStories = [];

                    // 🧩 Get all mutual contacts + self
                    $contStmt = $pdo->prepare("
                        SELECT DISTINCT recipient_id 
                        FROM contacts 
                        WHERE creator_id = ? AND is_mutual = 1 AND recipient_id != ?
                    ");
                    $contStmt->execute([$userId, $userId]);
                    $recipient_ids = $contStmt->fetchAll(\PDO::FETCH_COLUMN);
                    $recipient_ids[] = $userId;

                    if (!empty($recipient_ids)) {
                        $placeholders = implode(',', array_fill(0, count($recipient_ids), '?'));
                        $query = "
                            SELECT 
                                s.id, s.user_id, s.text, s.file_id, s.expires_at, 
                                u.email, f.file_path, f.file_type, 
                                s.updated_at, s.created_at
                            FROM stories s
                            LEFT JOIN files f ON s.file_id = f.id
                            LEFT JOIN users u ON s.user_id = u.id
                            WHERE s.user_id IN ($placeholders)
                            AND s.expires_at > NOW()
                        ";

                        $params = $recipient_ids;

                        if ($lastUpdatedAt) {
                            $query .= " AND s.updated_at > ?";
                            $params[] = $lastUpdatedAt;
                        }

                        $query .= " ORDER BY s.created_at ASC";
                        $stmt = $pdo->prepare($query);
                        $stmt->execute($params);

                        while ($story = $stmt->fetch(\PDO::FETCH_ASSOC)) {
                            $allStories[] = $story;
                            $lastUpdatedAt = $story['updated_at'];
                        }
                    }

                    // 🚀 Send only if new stories exist
                    if (!empty($allStories)) {
                        echo 'data: ' . json_encode($allStories) . "\n\n";
                        ob_flush();
                        flush();
                    } else {
                        echo "event: heartbeat\n";
                        echo "data: {}\n\n";
                        @ob_flush();
                        @flush();
                    }

                    sleep(3);
                } catch (\Throwable $e) {
                    // 🧯 Catch and report DB or timeout errors
                    echo "event: error\n";
                    echo 'data: ' . json_encode(['message' => $e->getMessage()]) . "\n\n";
                    ob_flush();
                    flush();

                    DB::disconnect(); // Ensure DB cleanup
                    sleep(3);
                }
            }
        });
    }


}
