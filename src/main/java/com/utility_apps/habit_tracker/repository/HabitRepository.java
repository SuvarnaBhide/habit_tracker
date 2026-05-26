package com.utility_apps.habit_tracker.repository;

import com.utility_apps.habit_tracker.entity.Habit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HabitRepository extends JpaRepository<Habit, Long> {
}
