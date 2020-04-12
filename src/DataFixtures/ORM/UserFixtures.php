<?php

namespace App\DataFixtures\ORM;


use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\Security\Core\Encoder\UserPasswordEncoderInterface;

class UserFixtures extends Fixture
{
    private $passwordEncoder;

    public function __construct(UserPasswordEncoderInterface $passwordEncoder)
    {
        $this->passwordEncoder = $passwordEncoder;
    }

    public function load(ObjectManager $manager): void
    {
        $superAdminUsers = ['gubs', 'migiway', 'predou'];
        $i = 1;
        foreach ($superAdminUsers as $superAdminUser) {
            $this->create($manager, $superAdminUser, $i, ['ROLE_SUPER_ADMIN']);
            ++$i;
        }

        // Users
        for ($i; $i < 10; ++$i) {
            $this->create($manager, 'user'.$i, $i,['ROLE_USER']);
        }
        $manager->flush();
    }


    private function create(ObjectManager $manager, string $username, $key, array $roles = []): void
    {
        $user = new User();
        $user
            ->setUsername($username)
            ->setEmail($username . '@vgmq.com')
            ->setPassword($this->passwordEncoder->encodePassword($user, 'xxx'))
            ->setRoles($roles)
            ->setEnabled(true);

        $manager->persist($user);
        $this->addReference('user-' . $key, $user);
    }
}
