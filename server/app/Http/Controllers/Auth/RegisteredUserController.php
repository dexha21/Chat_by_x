<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\User;
use App\Models\UserEmailVerify;
use Carbon\Carbon;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'verification_code' => ['required', 'max:6'],
            'password' => ['required', 'min:6', 'confirmed', Rules\Password::defaults()],
        ]);

        $verify = UserEmailVerify::where('email', $request->email)->where('code', $request->verification_code)->where('expires_at', '>=', Carbon::now())->first();

        if (!$verify) {
            return response()->json([
                'message' => 'Code doesn\'t exist or expired!'
            ]);
        }        

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);


        $verify->update([
            'user_id' => $user->id
        ]);

        Contact::where('email', $request->email)->update([
            'recipient_id' => $user->id
        ]);


        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Signed in!',
            'user' => $user,
            'token' => $token
        ]);
    }
}
