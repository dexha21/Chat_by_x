<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function create(Request $request) {
        $request->validate([
            'message' => 'required|string',
            'conversation_id' => 'required|exists:conversations,id',
            'message_type' => 'sometimes|integer',
            'client_id' => 'sometimes|string'
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json(["message" => "Not logged in!"]);
        }

        $chats = Chat::create([
            'client_id' => $request->client_id,
            'conversation_id' => $request->conversation_id,
            'sender_id' => $user->id,
            'message' => $request->message,
            'message_type' => isset($request->message_type) ? $request->message_type : 0
        ]);

        $last_message = [
            'id' => $request->client_id,
            'conversation_id' => $request->conversation_id,
            'sender_id' => $user->id,
            'message' => $request->message,
            'message_type' => $chats->message_type,
            'deleted' => 0,
            'updated_at' => $chats->updated_at,
            'created_at' => $chats->created_at
        ];

        return response()->json([
            'success' => true,
            'message' => 'message sent!',
            'sent_message' => $last_message
        ]);

    }
}
