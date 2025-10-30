<?php

namespace App\Http\Controllers;

use App\Models\Contacts;
use App\Models\User;
use Illuminate\Http\Request;

class ContactsController extends Controller
{
    public function create(Request $request)
    {
        $request->validate([
            "email" => "required|email",
            "name" => "required"
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json(["message" => "Not logged in"], 401);
        }

        $existing = Contacts::where('creator_id', $user->id)
            ->where('email', $request->email)
            ->first();

        if ($existing) {
            return response()->json(["message" => "Saved already!"]);
        }

        $user2 = User::where('email', $request->email)->first();

        $newContact = Contacts::create([
            'creator_id'   => $user->id,
            'recipient_id' => $user2?->id ?? null, 
            'email'        => $request->email,
            'name'         => $request->name,
        ]);

        // If recipient exists, check if they have also saved the current user
        if ($user2) {
            $reverse = Contacts::where('creator_id', $user2->id)
                ->where('email', $user->email)
                ->first();

            if ($reverse) {
                // Mark both as mutual
                $reverse->update(['is_mutual' => true]);
                $newContact->update(['is_mutual' => true]);
            }
        }

        return response()->json([
            "success" => true,
            "message" => "Contact saved!",
            "contact" => $newContact
        ]);
    }

    public function read(Request $request)
    {

        $user = $request->user();

        if (!$user) {
            return response()->json(["message" => "Not logged in"], 401);
        }

        $contacts = Contacts::with(['recipient'])->where('creator_id', $user->id)->get();

        return response()->json([
            "success" => true,
            "message" => "Fetched contacts",
            "contact" => $contacts
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            "id" => "required|exists:contacts,id",
            "email" => "sometimes|email",
            "name" => "sometimes"
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json(["success" => false, "message" => "Not logged in"]);
        }

        $contact = Contacts::where("id", $request->id)
            ->where("creator_id", $user->id)
            ->first();

        if (!$contact) {
            return response()->json(["success" => false, "message" => "Contact not found"]);
        }

        if (!$request->hasAny(["email", "name"])) {
            return response()->json(["success" => false, "message" => "Nothing to update"]);
        }

        $updateData = $request->only(["email", "name"]);

        // If email provided, check if user exists
        if ($request->has("email")) {
            $user2 = User::where("email", $request->email)->first();

            if ($user2) {
                $updateData["recipient_id"] = $user2->id;

                // Check if reverse contact exists
                $reverse = Contacts::where('creator_id', $user2->id)
                    ->where('email', $user->email)
                    ->first();

                if ($reverse) {
                    $reverse->update(['is_mutual' => true]);
                    $updateData['is_mutual'] = true;
                } else {
                    $updateData['is_mutual'] = false; 
                }
            } else {
                $updateData["recipient_id"] = null;
            }
        }

        $contact->update($updateData);

        return response()->json([
            "success" => true,
            "message" => "Contact updated!",
            "contact" => $contact->fresh()
        ]);
    }



    public function delete(Request $request)
    {
        $request->validate([
            "id" => "required|exists:contacts,id"
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json(["message" => "Not logged in"]);
        }

        $contact = Contacts::where("id", $request->id)
            ->where("creator_id", $user->id)
            ->first();

        if (!$contact) {
            return response()->json(["message" => "Contact not found"]);
        }

        $contact->delete();

        return response()->json([
            "success" => true,
            "message" => "Contact deleted!"
        ]);
    }



}
