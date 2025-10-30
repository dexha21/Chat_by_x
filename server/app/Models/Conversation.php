<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = ['type', 'name', 'user_id'];

    public function participants()
    {
        return $this->hasMany(ConversationParticipant::class);
    }


    public function chats()
    {
        return $this->hasMany(Chat::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
